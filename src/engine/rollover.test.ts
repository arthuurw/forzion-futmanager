import { newGame, makePlayer } from "./generate";
import { AI_FORMATION, autoLineup, isAvailable } from "./lineup";
import { isMarketOpen } from "./market";
import { migrateSave } from "./migrate";
import { createRng, mix32, randInt } from "./rng";
import { nextSeason } from "./rollover";
import { playRound, seasonReview } from "./season";
import { computeTable } from "./table";
import { busySeason } from "./test-fixtures";
import type { Club, GameState, Player, Position } from "./types";

/** Written out here, not imported (L-004). */
const expectedSalary = (rating: number) => Math.round((2000 * 1.09 ** (rating - 40)) / 100) * 100;
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const all = (s: GameState): Club[] => s.leagues.flatMap((l) => l.clubs);
const clubOf = (s: GameState, id: string) => all(s).find((c) => c.id === id)!;
const userOf = (s: GameState) => clubOf(s, s.userClubId!);
const everyone = (s: GameState): Player[] => [...all(s).flatMap((c) => c.players), ...s.market.freeAgents];

const cache = new Map<string, GameState>();
/** A finished season: the user manages club `clubIndex` of division `division`; goal 20, so never fired. */
function ended(seed = 30, division = 0, clubIndex = 0): GameState {
  const key = `${seed}-${division}-${clubIndex}`;
  if (!cache.has(key)) {
    let s = newGame(seed);
    const c = s.leagues[division]!.clubs[clubIndex]!;
    s.userClubId = c.id;
    s.boardGoal = 20;
    for (let r = 0; r < 38; r++) {
      userOf(s).lineup = autoLineup(userOf(s), AI_FORMATION);
      s = playRound(s).state;
    }
    cache.set(key, s);
  }
  return clone(cache.get(key)!);
}

let pad = 0;
function player(age: number, rating: number, position: Position = "MF", contractSeasons = 0): Player {
  pad++;
  return makePlayer(`t-${pad}`, `Teste ${pad}`, position, age, rating, contractSeasons);
}

describe("virada de temporada", () => {
  test("4 sobem e 4 descem", () => {
    const before = ended();
    const tableA = computeTable(before.leagues[0]!).map((r) => r.clubId);
    const tableB = computeTable(before.leagues[1]!).map((r) => r.clubId);
    const down = tableA.slice(16);
    const up = tableB.slice(0, 4);
    const { state } = nextSeason(before);
    const idsA = state.leagues[0]!.clubs.map((c) => c.id);
    const idsB = state.leagues[1]!.clubs.map((c) => c.id);
    expect(idsA).toEqual([...before.leagues[0]!.clubs.map((c) => c.id).filter((id) => !down.includes(id)), ...up]);
    expect(idsB).toEqual([...before.leagues[1]!.clubs.map((c) => c.id).filter((id) => !up.includes(id)), ...down]);
    expect(idsA).toHaveLength(20);
    expect(idsB).toHaveLength(20);
    expect(new Set([...idsA, ...idsB])).toEqual(new Set(all(before).map((c) => c.id)));
    for (const c of all(state)) expect(c.name).toBe(clubOf(before, c.id).name);
  });

  test("calendário novo e mercado aberto", () => {
    const { state } = nextSeason(ended());
    expect(state.season).toBe(2);
    for (const league of state.leagues) {
      expect(league.currentRound).toBe(0);
      expect(league.rounds).toHaveLength(38);
      const meetings = new Map<string, number>();
      for (const r of league.rounds) {
        expect(r.matches).toHaveLength(10);
        for (const m of r.matches) {
          expect(m.result).toBeNull();
          meetings.set(`${m.homeId}>${m.awayId}`, (meetings.get(`${m.homeId}>${m.awayId}`) ?? 0) + 1);
        }
      }
      const ids = league.clubs.map((c) => c.id);
      for (const a of ids) for (const b of ids) if (a !== b) expect(meetings.get(`${a}>${b}`), `${a}>${b}`).toBe(1);
    }
    expect(isMarketOpen(state)).toBe(true);
    expect(state.market.juniors.map((j) => j.id)).toEqual(["jr-2-1-1", "jr-2-1-2", "jr-2-1-3"]);
  });

  test("condição renovada mantém lesão e moral", () => {
    const before = ended();
    const marked = all(before).map((c) => c.players[0]!);
    marked.forEach((p, i) => Object.assign(p, { age: 22, contractSeasons: 3, injuryRounds: 1 + (i % 4), morale: (i % 5) - 2 || 1, suspendedRounds: 1, yellowCards: 2, fitness: 40 }));
    const { state } = nextSeason(before);
    for (const league of state.leagues) {
      for (const c of league.clubs) {
        for (const p of c.players) {
          expect([p.fitness, p.yellowCards, p.suspendedRounds], p.id).toEqual([100, 0, 0]);
        }
      }
    }
    for (const p of marked) {
      const now = everyone(state).find((x) => x.id === p.id)!;
      expect([now.injuryRounds, now.morale], p.id).toEqual([p.injuryRounds, p.morale]);
    }
  });

  test("caixa estádio e empréstimo continuam", () => {
    const before = ended();
    Object.assign(userOf(before).finance, { loan: 1_500_000, expansionRoundsLeft: 2 });
    before.market.offers = [{ id: "o-x", buyerId: before.leagues[0]!.clubs[1]!.id, playerId: userOf(before).players[0]!.id, amount: 900_000 }];
    const { state } = nextSeason(before);
    expect(state.market.offers).toEqual([]);
    for (const c of all(before)) {
      expect(c.finance.lastRound!.prize, c.id).toBeGreaterThan(0);
      expect(clubOf(state, c.id).finance, c.id).toEqual(c.finance);
    }
  });

  test("virada usa o próprio Rng", () => {
    const before = ended();
    // The first player of the first Série A club that stays up is young with a long contract: he stays and evolves.
    const down = computeTable(before.leagues[0]!).slice(16).map((r) => r.clubId);
    const stays = before.leagues[0]!.clubs.find((c) => !down.includes(c.id))!;
    Object.assign(stays.players[0]!, { age: 22, contractSeasons: 3, rating: 60 });
    const a = nextSeason(clone(before)).state;
    expect(nextSeason(clone(before)).state).toEqual(a);
    const advanced = createRng(before.rngState);
    advanced.next();
    expect(a.rngState).toBe(advanced.getState());
    // The first draw is the evolution of the first player of the new Série A, from mix32(rngState, 0x5E45 + season).
    const firstClub = a.leagues[0]!.clubs[0]!;
    const p0 = clubOf(before, firstClub.id).players[0]!;
    const band = p0.age <= 20 ? [2, 6] : p0.age <= 23 ? [1, 4] : p0.age <= 27 ? [-1, 2] : p0.age <= 30 ? [-2, 1] : p0.age <= 33 ? [-4, 0] : [-6, -2];
    const delta = randInt(createRng(mix32(before.rngState, 0x5e45 + before.season)), band[0]!, band[1]!);
    expect(firstClub.id).toBe(stays.id);
    const now = everyone(a).find((p) => p.id === p0.id);
    expect(now).toBeDefined();
    expect(now!.rating).toBe(p0.rating + delta);
    const other = nextSeason({ ...clone(before), rngState: before.rngState + 1 }).state;
    const ratings = (s: GameState) => all(s).flatMap((c) => c.players.map((p) => p.rating));
    expect(ratings(other)).not.toEqual(ratings(a));
  });
});

describe("evolução e aposentadoria", () => {
  test("evolução por idade", () => {
    const before = ended();
    const bands = [
      { ages: [17, 18, 19, 20], min: 2, max: 6 },
      { ages: [21, 22, 23], min: 1, max: 4 },
      { ages: [24, 25, 26, 27], min: -1, max: 2 },
      { ages: [28, 29, 30], min: -2, max: 1 },
      { ages: [31, 32, 33], min: -4, max: 0 },
      { ages: [34], min: -6, max: -2 },
    ];
    const fixture = bands.map((b) => Array.from({ length: 1000 }, (_, i) => player(b.ages[i % b.ages.length]!, 60)));
    const high = Array.from({ length: 30 }, () => player(18, 94));
    const low = Array.from({ length: 60 }, () => player(34, 41));
    before.market.freeAgents.push(...fixture.flat(), ...high, ...low);
    const { state } = nextSeason(before);
    const after = new Map(state.market.freeAgents.map((p) => [p.id, p]));
    bands.forEach((b, k) => {
      const deltas = fixture[k]!.filter((p) => after.has(p.id)).map((p) => after.get(p.id)!.rating - p.rating);
      expect(deltas.length, `faixa ${k}`).toBeGreaterThan(400);
      for (const d of deltas) {
        expect(d, `faixa ${k}`).toBeGreaterThanOrEqual(b.min);
        expect(d, `faixa ${k}`).toBeLessThanOrEqual(b.max);
      }
      expect(Math.min(...deltas), `faixa ${k}`).toBe(b.min);
      expect(Math.max(...deltas), `faixa ${k}`).toBe(b.max);
    });
    const highAfter = high.map((p) => after.get(p.id)!.rating);
    for (const r of highAfter) expect(r).toBeLessThanOrEqual(95);
    expect(highAfter).toContain(95);
    const lowAfter = low.filter((p) => after.has(p.id)).map((p) => after.get(p.id)!.rating);
    for (const r of lowAfter) expect(r).toBeGreaterThanOrEqual(40);
    expect(lowAfter).toContain(40);
  });

  test("todos envelhecem um ano", () => {
    const before = ended();
    // Some of the user's contracts end now, so leavers are among the players checked.
    userOf(before).players.slice(0, 3).forEach((p) => Object.assign(p, { contractSeasons: 1, age: 25 }));
    const leavers = userOf(before).players.slice(0, 3).map((p) => p.id);
    const { state } = nextSeason(before);
    const ages = new Map(everyone(before).map((p) => [p.id, p.age]));
    let checked = 0;
    for (const p of everyone(state)) {
      if (!ages.has(p.id)) continue;
      expect(p.age, p.id).toBe(ages.get(p.id)! + 1);
      checked++;
    }
    expect(checked).toBeGreaterThan(800);
    for (const id of leavers) expect(state.market.freeAgents.find((p) => p.id === id)!.age).toBe(26);
  });

  test("aposentadoria por idade", () => {
    const before = ended();
    // Ages before the birthday: 32..36, so 33..37 after it.
    const byAge = new Map([32, 33, 34, 35, 36].map((age) => [age + 1, Array.from({ length: 1000 }, () => player(age, 60))]));
    before.market.freeAgents.push(...[...byAge.values()].flat());
    // A 35-year-old starter of the user retires: gone from the squad, the lineup and the free agents.
    const me = userOf(before);
    const veteran = me.players[0]!;
    Object.assign(veteran, { age: 35, contractSeasons: 3 });
    me.lineup = autoLineup(me, AI_FORMATION);
    me.lineup.starters[0] = veteran.id;
    const { state } = nextSeason(before);
    const left = new Set(state.market.freeAgents.map((p) => p.id));
    const retiredShare = (age: number) => byAge.get(age)!.filter((p) => !left.has(p.id)).length / 1000;
    expect(retiredShare(33)).toBe(0);
    expect(retiredShare(34)).toBeGreaterThanOrEqual(0.15);
    expect(retiredShare(34)).toBeLessThanOrEqual(0.25);
    expect(retiredShare(35)).toBeGreaterThanOrEqual(0.45);
    expect(retiredShare(35)).toBeLessThanOrEqual(0.55);
    expect(retiredShare(36)).toBe(1);
    expect(retiredShare(37)).toBe(1);
    expect(everyone(state).some((p) => p.id === veteran.id)).toBe(false);
    expect(userOf(state).lineup!.starters).not.toContain(veteran.id);
  });

  test("IA repõe com juniores até 22", () => {
    const before = ended();
    const shape = (c: Club) => {
      const keep = [...c.players.filter((p) => p.position === "GK").slice(0, 3), ...c.players.filter((p) => p.position === "DF").slice(0, 6), ...c.players.filter((p) => p.position === "MF").slice(0, 6)];
      keep.forEach((p) => Object.assign(p, { age: 25, contractSeasons: 3 }));
      c.players = keep;
      c.lineup = null;
    };
    const ai = before.leagues[0]!.clubs.find((c) => c.id !== before.userClubId)!;
    shape(ai);
    shape(userOf(before));
    const kept = new Set(ai.players.map((p) => p.id));
    const { state } = nextSeason(before);
    const now = clubOf(state, ai.id);
    expect(now.players).toHaveLength(22);
    expect(userOf(state).players).toHaveLength(15);
    const mean = now.players.filter((p) => kept.has(p.id)).reduce((s, p) => s + p.rating, 0) / 15;
    const juniors = now.players.filter((p) => !kept.has(p.id));
    expect(juniors).toHaveLength(7);
    expect(juniors.slice(0, 3).map((p) => p.position)).toEqual(["FW", "FW", "FW"]);
    for (const j of juniors) {
      expect(j.age).toBeGreaterThanOrEqual(18);
      expect(j.age).toBeLessThanOrEqual(20);
      expect(j.rating).toBeGreaterThanOrEqual(Math.round(mean) - 12);
      expect(j.rating).toBeLessThanOrEqual(Math.round(mean) - 4);
      expect(j.contractSeasons).toBe(3);
    }
  });

  test("livres voltam a 40", () => {
    const before = ended();
    before.market.freeAgents = before.market.freeAgents.slice(0, 5).map((p) => ({ ...p, age: 22 }));
    // No club player leaves, so only new free agents can fill the list.
    for (const c of all(before)) for (const p of c.players) Object.assign(p, { contractSeasons: 3, age: Math.min(p.age, 30) });
    const old = new Set(before.market.freeAgents.map((p) => p.id));
    const { state } = nextSeason(before);
    expect(state.market.freeAgents.length).toBeGreaterThanOrEqual(40);
    const fresh = state.market.freeAgents.filter((p) => !old.has(p.id));
    expect(fresh.length).toBeGreaterThanOrEqual(35);
    for (const p of fresh) {
      expect(p.age).toBeGreaterThanOrEqual(19);
      expect(p.age).toBeLessThanOrEqual(31);
      expect(p.rating).toBeGreaterThanOrEqual(45);
      expect(p.rating).toBeLessThanOrEqual(70);
    }
  });
});

describe("contratos na virada", () => {
  test("contrato cai e último ano vai para os livres", () => {
    const before = ended();
    const me = userOf(before);
    me.players.forEach((p, i) => Object.assign(p, { age: 24, contractSeasons: 1 + (i % 4) }));
    me.lineup = autoLineup(me, AI_FORMATION);
    const last = me.players.filter((p) => p.contractSeasons === 1).map((p) => p.id);
    expect(last.length).toBeGreaterThan(0);
    const { state } = nextSeason(before);
    const now = userOf(state);
    for (const p of me.players) {
      if (last.includes(p.id)) {
        expect(now.players.some((x) => x.id === p.id), p.id).toBe(false);
        expect(now.lineup!.starters).not.toContain(p.id);
        expect(state.market.freeAgents.find((x) => x.id === p.id)?.contractSeasons, p.id).toBe(0);
      } else {
        expect(now.players.find((x) => x.id === p.id)!.contractSeasons, p.id).toBe(p.contractSeasons - 1);
      }
    }
  });

  test("IA renova até 32 anos", () => {
    const before = ended();
    const ai = before.leagues[1]!.clubs.find((c) => c.id !== before.userClubId)!;
    const young = ai.players.slice(0, 6);
    const old = ai.players.slice(6, 12);
    young.forEach((p) => Object.assign(p, { age: 32, contractSeasons: 1 }));
    old.forEach((p) => Object.assign(p, { age: 33, contractSeasons: 1 }));
    const { state } = nextSeason(before);
    const now = clubOf(state, ai.id);
    const lengths = new Set<number>();
    for (const p of young) {
      const x = now.players.find((q) => q.id === p.id)!;
      expect(x, p.id).toBeDefined();
      expect(x.contractSeasons).toBeGreaterThanOrEqual(1);
      expect(x.contractSeasons).toBeLessThanOrEqual(3);
      expect(x.salary).toBe(expectedSalary(x.rating));
      lengths.add(x.contractSeasons);
    }
    expect(lengths.size).toBeGreaterThan(1);
    const free = new Set(state.market.freeAgents.map((p) => p.id));
    let gone = 0;
    for (const p of old) {
      expect(now.players.some((q) => q.id === p.id), p.id).toBe(false);
      if (free.has(p.id)) gone++;
    }
    // 33-year-olds become 34: up to a fifth retire, the rest are free agents.
    expect(gone).toBeGreaterThan(0);
  });
});

describe("diretoria e histórico na virada", () => {
  test("demitido assume o novo clube", () => {
    const before = ended(31, 0, 5);
    const position = computeTable(before.leagues[0]!).findIndex((r) => r.clubId === before.userClubId) + 1;
    // A goal 5+ places above the final position fires the manager.
    expect(position).toBeGreaterThanOrEqual(6);
    before.boardGoal = position - 5;
    const review = seasonReview(before);
    expect(review.user!.verdict).toBe("fired");
    expect(review.jobOffers).toHaveLength(3);
    expect(() => nextSeason(clone(before))).toThrow();
    const pick = review.jobOffers[1]!;
    const { state } = nextSeason(before, pick);
    expect(state.userClubId).toBe(pick);
    const club = userOf(state);
    const starters = club.lineup!.starters.filter((id): id is string => !!id);
    expect(new Set(starters).size).toBe(11);
    for (const id of starters) expect(isAvailable(club.players.find((p) => p.id === id)!)).toBe(true);
    expect(clubOf(state, before.userClubId!).lineup).toBeNull();
    // The goal is the new club's, by its strength rank in its division (written out, L-004).
    const division = state.leagues.findIndex((l) => l.clubs.some((c) => c.id === pick));
    const best11 = (c: Club) => [...c.players].map((p) => p.rating).sort((a, b) => b - a).slice(0, 11).reduce((a, b) => a + b, 0) / 11;
    const rank = [...state.leagues[division]!.clubs].sort((a, b) => best11(b) - best11(a) || a.id.localeCompare(b.id)).findIndex((c) => c.id === pick) + 1;
    const goal = division === 0 ? Math.min(16, rank + 3) : rank <= 4 ? 4 : Math.min(20, rank + 3);
    expect(state.boardGoal).toBe(goal);
  });

  test("estatísticas vão para a carreira", () => {
    const before = ended();
    for (const p of everyone(before)) Object.assign(p, { careerGames: 100, careerGoals: 20 });
    const played = everyone(before).filter((p) => p.seasonGames > 0 && p.seasonGoals > 0);
    expect(played.length).toBeGreaterThan(0);
    const { state } = nextSeason(before);
    const was = new Map(everyone(before).map((p) => [p.id, p]));
    for (const p of everyone(state)) {
      const b = was.get(p.id);
      if (!b) continue;
      expect([p.seasonGames, p.seasonGoals], p.id).toEqual([0, 0]);
      expect([p.careerGames, p.careerGoals], p.id).toEqual([100 + b.seasonGames, 20 + b.seasonGoals]);
    }
  });

  test("histórico da temporada", () => {
    const before = ended();
    const topScorer = (division: number) => {
      const rows = before.leagues[division]!.clubs.flatMap((c) => c.players.map((p) => ({ name: p.name, clubName: c.name, goals: p.seasonGoals })));
      rows.sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name, "pt-BR"));
      return rows[0]!;
    };
    const tA = computeTable(before.leagues[0]!).map((r) => r.clubId);
    const tB = computeTable(before.leagues[1]!).map((r) => r.clubId);
    const position = tA.indexOf(before.userClubId!) + 1;
    const one = nextSeason(before).state;
    expect(one.history).toEqual([
      {
        season: 1,
        userClubId: before.userClubId,
        userLeagueId: "l1",
        userPosition: position,
        verdict: "met",
        prize: (21 - position) * 250_000,
        divisions: [
          { leagueId: "l1", championId: tA[0], promotedIds: [], relegatedIds: tA.slice(16), topScorer: topScorer(0) },
          { leagueId: "l2", championId: tB[0], promotedIds: tB.slice(0, 4), relegatedIds: [], topScorer: topScorer(1) },
        ],
      },
    ]);
    // A second season appends and leaves the first record as it was (Relations: only grows).
    let s = one;
    s.boardGoal = 20;
    for (let r = 0; r < 38; r++) {
      userOf(s).lineup = autoLineup(userOf(s), AI_FORMATION);
      s = playRound(s).state;
    }
    s.boardGoal = 20;
    const two = nextSeason(s).state;
    expect(two.history).toHaveLength(2);
    expect(two.history[0]).toEqual(one.history[0]);
    expect(two.history[1]!.season).toBe(2);
    // The saved document reads back with both records, oldest first.
    const read = migrateSave(clone(two));
    if (read.kind !== "ok") throw new Error("not read");
    expect(read.state.history.map((h) => h.season)).toEqual([1, 2]);
  }, 60_000);

  test("contrato de clube nunca abaixo de 1", () => {
    const s = busySeason();
    s.boardGoal = 20;
    const check = (state: GameState) => {
      for (const c of all(state)) for (const p of c.players) expect(p.contractSeasons, `${c.id} ${p.id}`).toBeGreaterThanOrEqual(1);
      for (const p of state.market.freeAgents) expect(p.contractSeasons, p.id).toBe(0);
    };
    check(s);
    check(nextSeason(s).state);
  });
});
