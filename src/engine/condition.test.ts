import { applyRound, playerAfterRound } from "./condition";
import { finishCupDate, startCupDate } from "./cup";
import { newGame } from "./generate";
import { AI_FORMATION, aiLineup, autoLineup } from "./lineup";
import { makeMatch, makeSide, runToEnd, startRound, type LivePlayer, type LiveSide } from "./live";
import { finishRound } from "./season";
import { atCupDate } from "./test-fixtures";
import { FRESH_CONDITION, ZERO_STATS, type GameState, type Player } from "./types";

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

const base: Player = { id: "p", name: "p", position: "MF", age: 25, rating: 70, ...FRESH_CONDITION, ...ZERO_STATS, salary: 0, contractSeasons: 1, cupDiscipline: {} };

/** A side where `p` played (or not), with the given match facts. */
function side(opts: { played?: boolean; fitness?: number; yellows?: number; red?: boolean; injured?: number } = {}): LiveSide {
  const s = makeSide("c", ["MF"], opts.played === false ? [null] : ["p"], [], { p: base });
  if (opts.played === false) s.played = [];
  if (opts.fitness !== undefined) s.fitness.p = opts.fitness;
  if (opts.yellows) s.yellows.p = opts.yellows;
  if (opts.red) s.sentOff.push("p");
  if (opts.injured) s.injured.p = opts.injured;
  return s;
}

describe("pós-rodada", () => {
  test("três amarelos suspendem e zeram", () => {
    const two = { ...base, yellowCards: 2 };
    const third = playerAfterRound(two, side({ yellows: 1 }), "draw");
    expect(third.suspendedRounds).toBe(1);
    expect(third.yellowCards).toBe(0);
    const one = playerAfterRound({ ...base, yellowCards: 1 }, side({ yellows: 1 }), "draw");
    expect(one).toMatchObject({ yellowCards: 2, suspendedRounds: 0 });
    // Serves the next round, then is available again.
    const served = playerAfterRound(third, side({ played: false }), "draw");
    expect(served.suspendedRounds).toBe(0);
  });

  test("vermelho suspende uma rodada", () => {
    const sent = playerAfterRound({ ...base, yellowCards: 1 }, side({ yellows: 2, red: true }), "loss");
    expect(sent.suspendedRounds).toBe(1);
    expect(sent.yellowCards).toBe(1);
    const served = playerAfterRound(sent, side({ played: false }), "win");
    expect(served.suspendedRounds).toBe(0);
  });

  test("recuperação 30 e 15 até 100", () => {
    expect(playerAfterRound({ ...base, fitness: 60 }, side({ fitness: 60 }), "draw").fitness).toBe(75);
    expect(playerAfterRound({ ...base, fitness: 60 }, side({ played: false }), "draw").fitness).toBe(90);
    expect(playerAfterRound({ ...base, fitness: 90 }, side({ played: false }), "draw").fitness).toBe(100);
    expect(playerAfterRound({ ...base, fitness: 95 }, side({ fitness: 95 }), "draw").fitness).toBe(100);
    expect(playerAfterRound({ ...base, fitness: 60 }, null, null).fitness).toBe(90);
  });

  test("lesão de 1 a 4 rodadas", () => {
    let p = playerAfterRound(base, side({ injured: 3, fitness: 80 }), "draw");
    expect(p.injuryRounds).toBe(3);
    for (const left of [2, 1, 0]) {
      p = playerAfterRound(p, side({ played: false }), "draw");
      expect(p.injuryRounds).toBe(left);
    }
    // Over many simulated rounds, injuries last 1, 2, 3 or 4 rounds and nothing else.
    const durations = new Set<number>();
    for (let seed = 1; seed <= 120; seed++) {
      const state = newGame(1);
      const club = state.leagues[0]!.clubs[0]!;
      state.userClubId = club.id;
      club.lineup = autoLineup(club, AI_FORMATION);
      state.rngState = seed * 97;
      for (const m of runToEnd(startRound(state)).matches) {
        for (const s of [m.home, m.away]) for (const d of Object.values(s.injured)) durations.add(d);
      }
    }
    expect([...durations].sort()).toEqual([1, 2, 3, 4]);
  });

  test("vitória sobe moral até +2", () => {
    expect(playerAfterRound({ ...base, morale: 1 }, side(), "win").morale).toBe(2);
    expect(playerAfterRound({ ...base, morale: 2 }, side(), "win").morale).toBe(2);
    expect(playerAfterRound({ ...base, morale: 0 }, side(), "draw").morale).toBe(0);
  });

  test("derrota baixa moral até -2", () => {
    expect(playerAfterRound({ ...base, morale: -1 }, side(), "loss").morale).toBe(-2);
    expect(playerAfterRound({ ...base, morale: -2 }, side(), "loss").morale).toBe(-2);
  });

  test("três rodadas sem jogar baixa moral", () => {
    let p = { ...base, morale: 1 };
    p = playerAfterRound(p, side({ played: false }), "win");
    p = playerAfterRound(p, side({ played: false }), "win");
    expect(p).toMatchObject({ idleRounds: 2, morale: 1 });
    p = playerAfterRound(p, side({ played: false }), "win");
    expect(p).toMatchObject({ idleRounds: 0, morale: 0 });
    // Playing resets the count.
    const back = playerAfterRound({ ...base, idleRounds: 2 }, side(), "draw");
    expect(back.idleRounds).toBe(0);
    // An injured player sitting out is not "idle".
    const hurt = playerAfterRound({ ...base, idleRounds: 2, injuryRounds: 2 }, side({ played: false }), "draw");
    expect(hurt).toMatchObject({ idleRounds: 2, morale: 0 });
  });
});

describe("números da temporada", () => {
  test("jogos e gols da temporada", () => {
    const state = newGame(18);
    const me = state.leagues[1]!.clubs[2]!;
    state.userClubId = me.id;
    me.lineup = autoLineup(me, AI_FORMATION);
    // Earlier numbers, so an overwrite cannot pass for a sum.
    for (const league of state.leagues) for (const c of league.clubs) for (const p of c.players) Object.assign(p, { seasonGames: 3, seasonGoals: 1 });
    const live = runToEnd(startRound(state));
    const after = finishRound(state, live).state;
    const played = new Set(live.matches.flatMap((m) => [...m.home.played, ...m.away.played]));
    const goals = new Map<string, number>();
    for (const m of live.matches) for (const g of m.goals) goals.set(g.playerId, (goals.get(g.playerId) ?? 0) + 1);
    let benched = 0;
    let scorers = 0;
    for (const league of after.leagues) {
      for (const c of league.clubs) {
        for (const p of c.players) {
          expect(p.seasonGames, p.id).toBe(3 + (played.has(p.id) ? 1 : 0));
          expect(p.seasonGoals, p.id).toBe(1 + (goals.get(p.id) ?? 0));
          if (!played.has(p.id)) benched++;
          if (goals.has(p.id)) scorers++;
        }
      }
    }
    expect(benched).toBeGreaterThan(0);
    expect(scorers).toBeGreaterThan(0);
    expect(live.matches.some((m) => m.leagueId === "l2" && m.goals.length > 0)).toBe(true);
  });
});

const CUP = { kind: "cup", cupId: "cup-nat" } as const;
const cupOf = (p: Player) => p.cupDiscipline["cup-nat"];

/** A state at the preliminary date: who plays it, who does not, and the date closed. */
function preliminaryDate(seed: number) {
  const s = atCupDate(seed, 0);
  const ties = s.cups[0]!.phases[0]!.ties;
  const inCup = new Set(ties.flatMap((t) => [t.homeId, t.awayId]));
  const clubs = s.leagues.flatMap((l) => l.clubs);
  return { s, played: clubs.filter((c) => inCup.has(c.id)), idle: clubs.filter((c) => !inCup.has(c.id)) };
}
const find = (s: GameState, id: string) => s.leagues.flatMap((l) => l.clubs.flatMap((c) => c.players)).find((p) => p.id === id)!;

describe("disciplina e condição na copa", () => {
  test("amarelos de copa", () => {
    const one = playerAfterRound(base, side({ yellows: 1 }), "draw", 0, CUP);
    expect(cupOf(one)).toEqual({ yellowCards: 1, suspendedRounds: 0 });
    const two = playerAfterRound(one, side({ yellows: 1 }), "draw", 0, CUP);
    expect(cupOf(two)).toEqual({ yellowCards: 2, suspendedRounds: 0 });
    const three = playerAfterRound(two, side({ yellows: 1 }), "draw", 0, CUP);
    expect(cupOf(three)).toEqual({ yellowCards: 0, suspendedRounds: 1 });
    // Through the cup date's close (L-003): every booked player, not sent off, counts it in the cup only.
    const { s } = preliminaryDate(81);
    const live = runToEnd(startCupDate(s));
    const booked = live.matches.flatMap((m) => [m.home, m.away].flatMap((sd) => Object.keys(sd.yellows).filter((id) => !sd.sentOff.includes(id))));
    expect(booked.length).toBeGreaterThan(0);
    const after = finishCupDate(s, live).state;
    for (const id of booked) {
      expect(cupOf(find(after, id)), id).toEqual({ yellowCards: 1, suspendedRounds: 0 });
      expect(find(after, id).yellowCards, id).toBe(find(s, id).yellowCards);
    }
  });

  test("vermelho de copa", () => {
    const sent = playerAfterRound(base, side({ yellows: 2, red: true }), "loss", 0, CUP);
    expect(cupOf(sent)).toEqual({ yellowCards: 0, suspendedRounds: 1 });
    const bookedBefore = { ...base, cupDiscipline: { "cup-nat": { yellowCards: 1, suspendedRounds: 0 } } };
    expect(cupOf(playerAfterRound(bookedBefore, side({ yellows: 1, red: true }), "loss", 0, CUP))).toEqual({ yellowCards: 1, suspendedRounds: 1 });
  });

  test("copa não mexe na disciplina da liga", () => {
    const p = playerAfterRound({ ...base, yellowCards: 2, suspendedRounds: 0 }, side({ yellows: 2, red: true }), "loss", 0, CUP);
    expect([p.yellowCards, p.suspendedRounds]).toEqual([2, 0]);
    expect(cupOf(p)!.suspendedRounds).toBe(1);
  });

  test("liga não mexe na disciplina da copa", () => {
    const withCup = { ...base, cupDiscipline: { "cup-nat": { yellowCards: 2, suspendedRounds: 1 } } };
    const p = playerAfterRound(withCup, side({ yellows: 2, red: true }), "loss");
    expect(p.cupDiscipline).toEqual({ "cup-nat": { yellowCards: 2, suspendedRounds: 1 } });
    expect(p.suspendedRounds).toBe(1);
    // Through a league round's close (L-003): nobody's cup discipline moves.
    const state = newGame(82);
    for (const c of state.leagues.flatMap((l) => l.clubs)) for (const q of c.players) q.cupDiscipline = { "cup-nat": { yellowCards: 2, suspendedRounds: 1 } };
    const after = finishRound(state, startRound(state)).state;
    for (const c of after.leagues.flatMap((l) => l.clubs)) for (const q of c.players) expect(q.cupDiscipline, q.id).toEqual({ "cup-nat": { yellowCards: 2, suspendedRounds: 1 } });
  });

  test("cumpre suspensão de copa", () => {
    const { s, played, idle } = preliminaryDate(83);
    const suspended = { "cup-nat": { yellowCards: 0, suspendedRounds: 1 } };
    const inCup = played[0]!.players.find((p) => !aiLineup(played[0]!).starters.includes(p.id))!;
    const outOfCup = idle[0]!.players[0]!;
    inCup.cupDiscipline = clone(suspended);
    outOfCup.cupDiscipline = clone(suspended);
    const after = finishCupDate(s, startCupDate(s)).state;
    expect(cupOf(find(after, inCup.id))!.suspendedRounds).toBe(0);
    expect(cupOf(find(after, outOfCup.id))!.suspendedRounds).toBe(1);
  });

  test("lesão e cansaço na data de copa", () => {
    const { s, played, idle } = preliminaryDate(84);
    const hurtIn = played[0]!.players[21]!;
    const hurtOut = idle[0]!.players[21]!;
    hurtIn.injuryRounds = 2;
    hurtOut.injuryRounds = 2;
    const live = runToEnd(startCupDate(s));
    const after = finishCupDate(s, live).state;
    expect(find(after, hurtIn.id).injuryRounds).toBe(1);
    expect(find(after, hurtOut.id).injuryRounds).toBe(1);
    let checked = 0;
    for (const m of live.matches) {
      for (const sd of [m.home, m.away]) {
        for (const id of sd.played) {
          if (sd.injured[id]) continue;
          expect(find(after, id).fitness, id).toBe(Math.min(100, Math.round(sd.fitness[id]!) + 15));
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(160);
  });

  test("moral na copa", () => {
    expect(playerAfterRound({ ...base, morale: 0 }, side(), "win", 0, CUP).morale).toBe(1);
    expect(playerAfterRound({ ...base, morale: 2 }, side(), "win", 0, CUP).morale).toBe(2);
    expect(playerAfterRound({ ...base, morale: 0 }, side(), "loss", 0, CUP).morale).toBe(-1);
    expect(playerAfterRound({ ...base, morale: -2 }, side(), "loss", 0, CUP).morale).toBe(-2);
    // A tie level at 90' and decided on penalties: the side that goes through counts as a win.
    const state = newGame(85);
    const [home, away] = [state.leagues[0]!.clubs[0]!, state.leagues[1]!.clubs[0]!];
    const players: Record<string, LivePlayer> = {};
    for (const c of [home, away]) for (const p of c.players) players[p.id] = { ...p };
    const sideFor = (c: typeof home) => makeSide(c.id, ["MF", "MF"], [c.players[0]!.id, c.players[1]!.id], [], players);
    const m = makeMatch("cup-nat-p0-m0", sideFor(home), sideFor(away), 1, "cup-nat");
    Object.assign(m, { homeGoals: 1, awayGoals: 1, penalties: { home: 4, away: 3 } });
    home.players[1]!.morale = 2;
    away.players[1]!.morale = -2;
    const [h, a] = applyRound([home, away], [m], CUP);
    expect(h!.players.slice(0, 2).map((p) => p.morale)).toEqual([1, 2]);
    expect(a!.players.slice(0, 2).map((p) => p.morale)).toEqual([-1, -2]);
  });

  test("clube fora da data descansa", () => {
    const rested = playerAfterRound({ ...base, fitness: 60, idleRounds: 2, morale: 1 }, null, null, 0, CUP);
    expect([rested.fitness, rested.idleRounds, rested.morale]).toEqual([90, 2, 1]);
    expect(playerAfterRound({ ...base, fitness: 85 }, null, null, 0, CUP).fitness).toBe(100);
    // Through the cup date's close (L-003), for a club without a tie.
    const { s, idle } = preliminaryDate(86);
    const [a, b] = [idle[0]!.players[0]!, idle[0]!.players[1]!];
    Object.assign(a, { fitness: 60, idleRounds: 2, morale: 1 });
    Object.assign(b, { fitness: 85, idleRounds: 2, morale: -1 });
    const after = finishCupDate(s, startCupDate(s)).state;
    const [a2, b2] = [find(after, a.id), find(after, b.id)];
    expect([a2.fitness, a2.idleRounds, a2.morale]).toEqual([90, 2, 1]);
    expect([b2.fitness, b2.idleRounds, b2.morale]).toEqual([100, 2, -1]);
  });
});
