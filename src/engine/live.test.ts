import { newGame } from "./generate";
import { AI_FORMATION, autoLineup, formationSlots } from "./lineup";
import {
  MAX_SUBS,
  changeFormation,
  runToEnd,
  sideStrength,
  startRound,
  step,
  substitute,
  userMatch,
  type LiveRound,
  type LiveSide,
} from "./live";
import { narrate, narrationContext } from "./narration";
import { finishRound, playRound } from "./season";
import { effectiveRating } from "./strength";
import { MATCH_EVENT_TYPES, type GameState, type MatchEventType, type Player } from "./types";

function game(seed = 1, clubIndex = 0): GameState {
  const state = newGame(seed);
  const club = state.leagues[0]!.clubs[clubIndex]!;
  state.userClubId = club.id;
  club.lineup = autoLineup(club, AI_FORMATION);
  return state;
}

function stepTo(live: LiveRound, minute: number): LiveRound {
  let l = live;
  while (l.minute < minute) l = step(l);
  return l;
}

function userSide(live: LiveRound): LiveSide {
  const m = userMatch(live)!;
  return m.home.clubId === live.userClubId ? m.home : m.away;
}

function ok(d: ReturnType<typeof substitute>): LiveRound {
  if (!d.ok) throw new Error(`refused: ${d.reason}`);
  return d.live;
}

/** Plays the round with the given decisions at minute 30 and returns every result. */
function playWith(state: GameState, decide: (live: LiveRound) => LiveRound) {
  const live = decide(stepTo(startRound(state), 30));
  return finishRound(state, live).results;
}

describe("rodada ao vivo (engine)", () => {
  test("mesmas decisões mesmos resultados", () => {
    const state = game(4);
    const decide = (l: LiveRound) => ok(substitute(l, state.userClubId!, 10, userSide(l).bench[0]!));
    const a = playWith(state, decide);
    const b = playWith(state, decide);
    expect(a).toHaveLength(10);
    expect(b).toEqual(a);
  });

  test("substituição não muda os outros 9 jogos", () => {
    const state = game(4);
    const withSub = playWith(state, (l) => ok(substitute(l, state.userClubId!, 10, userSide(l).bench[0]!)));
    const without = playWith(state, (l) => l);
    const isUser = (r: (typeof withSub)[number]) => r.homeId === state.userClubId || r.awayId === state.userClubId;
    expect(withSub.filter((r) => !isUser(r))).toEqual(without.filter((r) => !isUser(r)));
    expect(withSub.filter((r) => !isUser(r))).toHaveLength(9);
  });

  test("playRound equivale a rodada ao vivo sem decisões", () => {
    const state = game(9);
    const direct = playRound(state);
    const viaLive = finishRound(state, runToEnd(startRound(state)));
    let stepped = startRound(state);
    while (stepped.minute < 90) stepped = step(stepped);
    const viaSteps = finishRound(state, stepped);
    expect(viaLive).toEqual(direct);
    expect(viaSteps).toEqual(direct);
  });

  test("substituição entra no slot e narra", () => {
    const state = game(2);
    let live = stepTo(startRound(state), 20);
    const before = userSide(live);
    const outId = before.slots[10]!;
    const inId = before.bench[0]!;
    live = ok(substitute(live, state.userClubId!, 10, inId));
    const after = userSide(live);
    expect(after.slots[10]).toBe(inId);
    expect(after.subsUsed).toBe(1);
    expect(after.bench).not.toContain(inId);
    expect(userMatch(live)!.events.at(-1)).toEqual({
      minute: 20,
      type: "substitution",
      clubId: state.userClubId,
      playerId: outId,
      playerInId: inId,
    });
    // From the next minute the new player is on the pitch and tiring; the old one is not.
    live = step(live);
    const next = userSide(live);
    expect(next.fitness[inId]).toBeLessThan(100);
    expect(next.slots).not.toContain(outId);
  });

  test("sexta substituição recusada", () => {
    const state = game(2);
    let live = stepTo(startRound(state), 10);
    for (let i = 0; i < MAX_SUBS; i++) live = ok(substitute(live, state.userClubId!, 10 - i, userSide(live).bench[0]!));
    expect(MAX_SUBS).toBe(5);
    expect(userSide(live).subsUsed).toBe(5);
    const sixth = substitute(live, state.userClubId!, 1, userSide(live).bench[0]!);
    expect(sixth).toEqual({ ok: false, reason: "limit" });
  });

  test("quem saiu não volta", () => {
    const state = game(2);
    let live = stepTo(startRound(state), 10);
    const outId = userSide(live).slots[10]!;
    live = ok(substitute(live, state.userClubId!, 10, userSide(live).bench[0]!));
    expect(substitute(live, state.userClubId!, 9, outId)).toEqual({ ok: false, reason: "returning" });
  });

  test("expulso não pode ser substituído", () => {
    const state = game(2);
    const live = stepTo(startRound(state), 10);
    const side = userSide(live);
    const expelled = side.slots[4]!;
    side.slots[4] = null;
    side.vacancy[4] = { why: "red", playerId: expelled };
    side.sentOff.push(expelled);
    expect(substitute(live, state.userClubId!, 4, side.bench[0]!)).toEqual({ ok: false, reason: "sent_off" });
  });

  test("mudar formação redistribui sem tirar ninguém", () => {
    const state = game(3);
    const live = stepTo(startRound(state), 30);
    const before = userSide(live);
    const onBefore = before.slots.filter(Boolean).sort();
    const after = userSide(changeFormation(live, state.userClubId!, "3-5-2"));
    expect(after.formation).toBe("3-5-2");
    expect(after.slotPos).toEqual(formationSlots("3-5-2"));
    expect(after.slots.filter(Boolean).sort()).toEqual(onBefore);
    // 4-4-2 -> 3-5-2: one defender now sits in a midfield slot.
    const players = live.players;
    const outOfPosition = after.slots.filter((id, i) => id && players[id]!.position !== after.slotPos[i]);
    expect(outOfPosition).toHaveLength(1);
    expect(players[outOfPosition[0]!]!.position).toBe("DF");
  });

  test("IA substitui lesionado e cansado", () => {
    const state = game(5);
    let live = stepTo(startRound(state), 10);
    const m = live.matches.find((x) => x !== userMatch(live))!;
    const ai = m.home;
    // Injured defender in slot 2: replaced at once by a bench defender.
    const hurt = ai.slots[2]!;
    ai.slots[2] = null;
    ai.vacancy[2] = { why: "injury", playerId: hurt };
    ai.injured[hurt] = 2;
    live = step(live);
    const afterInjury = live.matches.find((x) => x.matchId === m.matchId)!.home;
    const replacement = afterInjury.slots[2]!;
    expect(replacement).toBeTruthy();
    expect(replacement).not.toBe(hurt);
    expect(live.players[replacement]!.position).toBe("DF");
    expect(afterInjury.subsUsed).toBeGreaterThanOrEqual(1);

    // From the 60th minute, a midfielder under 60 fitness is swapped for a bench midfielder.
    live.minute = 60;
    const side = live.matches.find((x) => x.matchId === m.matchId)!.home;
    side.subsUsed = 1;
    const tiredSlot = side.slotPos.indexOf("MF");
    const tired = side.slots[tiredSlot]!;
    side.fitness[tired] = 50;
    live = step(live);
    const afterTired = live.matches.find((x) => x.matchId === m.matchId)!.home;
    expect(afterTired.slots[tiredSlot]).not.toBe(tired);
    expect(live.players[afterTired.slots[tiredSlot]!]!.position).toBe("MF");

    // With 5 substitutions used, nobody else comes on.
    const capped = live.matches.find((x) => x.matchId === m.matchId)!.home;
    capped.subsUsed = MAX_SUBS;
    const other = capped.slots[capped.slotPos.lastIndexOf("MF")]!;
    capped.fitness[other] = 40;
    live = step(live);
    const afterCap = live.matches.find((x) => x.matchId === m.matchId)!.home;
    expect(afterCap.slots).toContain(other);
    expect(afterCap.subsUsed).toBe(MAX_SUBS);
  });

  test("segundo amarelo vira vermelho e sai", () => {
    let found = 0;
    for (let seed = 1; seed <= 40 && found < 3; seed++) {
      const state = game(1);
      state.rngState = seed * 7919;
      const live = runToEnd(startRound(state));
      for (const m of live.matches) {
        for (const side of [m.home, m.away]) {
          for (const id of side.sentOff) {
            if (side.yellows[id] !== 2) continue;
            found++;
            const mine = m.events.filter((e) => e.playerId === id && (e.type === "yellow" || e.type === "red"));
            expect(mine.map((e) => e.type)).toEqual(["yellow", "red"]);
            expect(side.slots).not.toContain(id);
            const redAt = mine[1]!.minute;
            expect(m.events.some((e) => e.minute > redAt && e.playerId === id && e.type !== "substitution")).toBe(false);
          }
        }
      }
    }
    expect(found).toBeGreaterThan(0);
  });

  test("expulsão deixa time com 10 e setor mais fraco", () => {
    const state = game(6);
    const live = stepTo(startRound(state), 20);
    const side = userSide(live);
    const before = sideStrength(side, live.players);
    const df = side.slotPos.indexOf("DF");
    const id = side.slots[df]!;
    side.slots[df] = null;
    side.vacancy[df] = { why: "red", playerId: id };
    side.sentOff.push(id);
    const after = sideStrength(side, live.players);
    expect(side.slots.filter(Boolean)).toHaveLength(10);
    expect(after.def).toBeLessThan(before.def);
    const later = userSide(stepTo(live, 90));
    expect(later.slots[df]).toBeNull();
  });

  test("condição cai por minuto e mais rápido acima de 30", () => {
    // Find a user side with a starter aged 30 or less and one above 30 who stay on for 10 minutes.
    for (let seed = 1; seed < 50; seed++) {
      const state = game(seed);
      const start = startRound(state);
      const side = userSide(start);
      const young = side.slots.find((id) => id && start.players[id]!.age <= 30);
      const old = side.slots.find((id) => id && start.players[id]!.age > 30);
      if (!young || !old) continue;
      const end = userSide(stepTo(start, 10));
      if (!end.slots.includes(young) || !end.slots.includes(old)) continue;
      expect(100 - end.fitness[young]!).toBeCloseTo(1.5, 5);
      expect(100 - end.fitness[old]!).toBeCloseTo(2.0, 5);
      return;
    }
    throw new Error("no suitable squad found");
  });

  test("IA poupa quem está abaixo de 60 de condição", () => {
    const state = game(3);
    const league = state.leagues[0]!;
    const aiClub = league.clubs.find((c) => c.id !== state.userClubId)!;
    const firstXI = autoLineup(aiClub, AI_FORMATION).starters;
    const byId = (id: string) => aiClub.players.find((p) => p.id === id)!;
    // Tire a starting forward just below the line and put a starting midfielder exactly on it.
    const tiredFw = byId(firstXI.find((id) => byId(id!).position === "FW")!);
    const edgeMf = byId(firstXI.find((id) => byId(id!).position === "MF")!);
    tiredFw.fitness = 59;
    edgeMf.fitness = 60;
    const rested = aiClub.players.filter((p) => p.position === "FW" && p.id !== tiredFw.id && p.fitness >= 60);
    expect(rested.length).toBeGreaterThanOrEqual(2);

    const live = startRound(state);
    const match = live.matches.find((m) => m.home.clubId === aiClub.id || m.away.clubId === aiClub.id)!;
    const side = match.home.clubId === aiClub.id ? match.home : match.away;
    expect(side.slots).not.toContain(tiredFw.id);
    expect(side.bench).toContain(tiredFw.id);
    expect(side.slots).toContain(edgeMf.id);
    const fwSlots = side.slots.filter((_, i) => side.slotPos[i] === "FW");
    for (const id of fwSlots) expect(live.players[id!]!.position).toBe("FW");
  });

  test("lesionado sai na hora", () => {
    for (let seed = 1; seed < 200; seed++) {
      const state = game(1);
      state.rngState = seed * 104729;
      let live = startRound(state);
      while (live.minute < 90) {
        live = step(live);
        for (const m of live.matches) {
          const injury = m.events.find((e) => e.type === "injury" && e.minute === live.minute);
          if (!injury) continue;
          const side = m.home.clubId === injury.clubId ? m.home : m.away;
          expect(side.slots).not.toContain(injury.playerId);
          expect(side.injured[injury.playerId!]).toBeGreaterThanOrEqual(1);
          expect(side.injured[injury.playerId!]).toBeLessThanOrEqual(4);
          return;
        }
      }
    }
    throw new Error("no injury found");
  });

  test("condição 50 rende 85%", () => {
    const p: Player = { id: "x", name: "x", position: "MF", age: 25, rating: 80, fitness: 100, morale: 0, injuryRounds: 0, suspendedRounds: 0, yellowCards: 0, idleRounds: 0, salary: 0, contractSeasons: 1, seasonGames: 0, seasonGoals: 0, careerGames: 0, careerGoals: 0 };
    expect(effectiveRating({ ...p, fitness: 50 }, "MF") / effectiveRating(p, "MF")).toBeCloseTo(0.85, 10);
  });

  test("moral +2 rende 6% a mais", () => {
    const p: Player = { id: "x", name: "x", position: "FW", age: 25, rating: 70, fitness: 100, morale: 0, injuryRounds: 0, suspendedRounds: 0, yellowCards: 0, idleRounds: 0, salary: 0, contractSeasons: 1, seasonGames: 0, seasonGoals: 0, careerGames: 0, careerGoals: 0 };
    expect(effectiveRating({ ...p, morale: 2 }, "FW") / effectiveRating(p, "FW")).toBeCloseTo(1.06, 10);
  });

  test("todos os 10 tipos de evento ocorrem e têm narração", () => {
    const seen = new Map<MatchEventType, string>();
    const base = game(1);
    const ctx = narrationContext(base.leagues[0]!.clubs);
    for (let seed = 1; seed <= 200 && seen.size < MATCH_EVENT_TYPES.length; seed++) {
      const state = game(1);
      state.rngState = seed * 2654435761;
      for (const m of runToEnd(startRound(state)).matches) {
        for (const e of m.events) {
          const text = narrate(e, ctx);
          expect(text.length).toBeGreaterThan(0);
          if (!seen.has(e.type)) seen.set(e.type, text);
        }
      }
    }
    expect(MATCH_EVENT_TYPES).toHaveLength(10);
    expect([...seen.keys()].sort()).toEqual([...MATCH_EVENT_TYPES].sort());
    expect(new Set(seen.values()).size).toBe(10);
  });
});
