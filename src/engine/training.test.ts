import { nextDate } from "./calendar";
import { applyRound } from "./condition";
import { finishCupDate, startCupDate } from "./cup";
import { newGame } from "./generate";
import { AI_FORMATION, autoLineup } from "./lineup";
import { runToEnd, startRound } from "./live";
import { createRng, mix32, type Rng } from "./rng";
import { nextSeason } from "./rollover";
import { finishRound, playDate, seasonReview } from "./season";
import { atCupDate } from "./test-fixtures";
import { evolutionChances, evolveRound } from "./training";
import type { Club, GameState, Player, Training } from "./types";

function game(seed = 1): GameState {
  const state = newGame(seed);
  const club = state.leagues[0]!.clubs[0]!;
  state.userClubId = club.id;
  club.lineup = autoLineup(club, AI_FORMATION);
  return state;
}

/** An Rng that returns `values` in order. */
function fakeRng(values: number[]): Rng & { left: () => number } {
  const queue = [...values];
  return {
    next: () => {
      const v = queue.shift();
      if (v === undefined) throw new Error("no more draws");
      return v;
    },
    getState: () => 0,
    left: () => queue.length,
  };
}

const allPlayers = (s: GameState): Player[] => [
  ...s.leagues.flatMap((l) => l.clubs.flatMap((c) => c.players)),
  ...s.market.freeAgents,
  ...s.market.juniors,
];

describe("evolução por rodada (treino-evolucao)", () => {
  test("chances por idade: tabela", () => {
    // C1 (L-005): the 6 bands of EVOLUTION, written out as their mean's positive and negative parts;
    // who played goes up × 1,3.
    const rows: [number[], number, number][] = [
      [[17, 20], 2.5, 0],
      [[21, 23], 1.5, 0],
      [[24, 27], 1 / 3, 1 / 3],
      [[28, 30], 0, 1],
      [[31, 33], 0, 2.5],
      [[34, 36], 0, 4],
    ];
    for (const [ages, u, d] of rows) {
      for (const age of ages) {
        const c = evolutionChances(age, "normal", true, 38);
        expect(c.up, `idade ${age}`).toBeCloseTo((u * 1.3) / 38, 12);
        expect(c.down, `idade ${age}`).toBeCloseTo(d / 38, 12);
      }
    }
    expect(evolutionChances(19, "normal", true, 30).up).toBeCloseTo((2.5 * 1.3) / 30, 12);
  });

  test("treino e minutos: tabela", () => {
    // C2: training and minutes weigh on going up only; absent training is Normal.
    const cases: [Training | undefined, number][] = [
      ["light", 1.25],
      ["normal", 2.5],
      ["hard", 3.75],
      [undefined, 2.5],
    ];
    for (const [training, up] of cases) {
      expect(evolutionChances(19, training, true, 38).up, `${training} jogou`).toBeCloseTo((up * 1.3) / 38, 12);
      expect(evolutionChances(19, training, false, 38).up, `${training} não jogou`).toBeCloseTo((up * 0.65) / 38, 12);
      for (const played of [true, false]) expect(evolutionChances(32, training, played, 38).down, `${training} ${played}`).toBeCloseTo(2.5 / 38, 12);
    }
  });

  test("sorteio sobe, desce ou fica", () => {
    // C3 (L-006): age 25, played, Normal, one round -> up 1/3 × 1,3 ≈ 0,433, down 1/3 (so −1 below ≈ 0,767).
    const base = game(3).leagues[0]!.clubs[0]!;
    const one = (rating: number, log?: Player["ratingLog"]): Club => ({
      ...base,
      players: [{ ...base.players[0]!, age: 25, rating, ratingLog: log }],
    });
    const run = (club: Club, draw: number) => {
      const rng = fakeRng([draw]);
      const [out] = evolveRound([club], new Set([club.players[0]!.id]), rng, 7, 1);
      expect(rng.left()).toBe(0);
      return out!.players[0]!;
    };
    const earlier = [{ round: 2, delta: -1 as const }];
    const up = run(one(70, earlier), 0.2);
    expect(up.rating).toBe(71);
    expect(up.ratingLog).toEqual([...earlier, { round: 7, delta: 1 }]);
    const down = run(one(70), 0.5);
    expect(down.rating).toBe(69);
    expect(down.ratingLog).toEqual([{ round: 7, delta: -1 }]);
    const stays = run(one(70, earlier), 0.8);
    expect(stays.rating).toBe(70);
    expect(stays.ratingLog).toEqual(earlier);
    const top = run(one(95), 0.2);
    expect(top.rating).toBe(95);
    expect(top.ratingLog ?? []).toEqual([]);
    const bottom = run(one(40), 0.5);
    expect(bottom.rating).toBe(40);
    expect(bottom.ratingLog ?? []).toEqual([]);

    // One draw per player, clubs then players: the second club's first player gets the third draw.
    const two: Club = { ...base, id: "x", players: [{ ...base.players[1]!, age: 25, rating: 60 }] };
    const pair: Club = { ...base, players: [{ ...base.players[0]!, age: 25, rating: 60 }, { ...base.players[2]!, age: 25, rating: 60 }] };
    const played = new Set([...pair.players, ...two.players].map((p) => p.id));
    const rng = fakeRng([0.8, 0.8, 0.2]);
    const [a, b] = evolveRound([pair, two], played, rng, 7, 1);
    expect(a!.players.map((p) => p.rating)).toEqual([60, 60]);
    expect(b!.players[0]!.rating).toBe(61);
    expect(rng.left()).toBe(0);
  });

  test("rodada da liga evolui pelo finishRound", () => {
    // C4 (L-003, door 3): the changes are evolveRound's on the clubs after condition, with the
    // league's own stream written out here, and the save's Rng moves once.
    const before = game(4);
    const live = runToEnd(startRound(before));
    const { state: after } = finishRound(before, live);
    const byId = new Map(allPlayers(after).map((p) => [p.id, p]));
    const leaguesChanged = new Set<number>();
    before.leagues.forEach((league, d) => {
      const matches = live.matches.filter((m) => m.leagueId === league.id);
      const played = new Set(matches.flatMap((m) => [...m.home.played, ...m.away.played]));
      const n = league.rounds[live.roundIndex]!.number;
      const rng = createRng(mix32(mix32(before.rngState, 0x7e), n * 16 + d));
      const expected = evolveRound(applyRound(league.clubs, matches), played, rng, n, league.rounds.length);
      for (const p of expected.flatMap((c) => c.players)) {
        const got = byId.get(p.id);
        if (!got) continue;
        expect(got.rating, p.id).toBe(p.rating);
        expect(got.ratingLog ?? [], p.id).toEqual(p.ratingLog ?? []);
        const old = league.clubs.flatMap((c) => c.players).find((x) => x.id === p.id)!;
        if (got.rating !== old.rating) {
          leaguesChanged.add(d);
          expect(got.ratingLog!.at(-1)).toEqual({ round: n, delta: got.rating - old.rating });
        }
      }
    });
    expect(leaguesChanged.size).toBeGreaterThanOrEqual(2);
    const advanced = createRng(before.rngState);
    advanced.next();
    expect(after.rngState).toBe(advanced.getState());
  });

  test("data de copa não evolui", () => {
    // C5 (L-007): a cup date changes no rating and no log.
    const before = atCupDate(6, 0);
    const { state: after } = finishCupDate(before, startCupDate(before));
    const was = new Map(allPlayers(before).map((p) => [p.id, p]));
    let seen = 0;
    for (const p of allPlayers(after)) {
      const old = was.get(p.id);
      if (!old) continue;
      seen++;
      expect(p.rating, p.id).toBe(old.rating);
      expect(p.ratingLog ?? [], p.id).toEqual(old.ratingLog ?? []);
    }
    expect(seen).toBeGreaterThan(1000);
  });

  test("save antigo sem os campos", () => {
    // C17 (doors 1 and 2): a v8 save with neither field plays a season and turns it.
    let s = game(8);
    for (const c of s.leagues.flatMap((l) => l.clubs)) {
      expect("training" in c).toBe(false);
      for (const p of c.players) expect("ratingLog" in p).toBe(false);
    }
    while (nextDate(s).kind !== "over") s = playDate(s).state;
    const user = s.leagues.flatMap((l) => l.clubs).find((c) => c.id === s.userClubId)!;
    expect(user.training).toBeUndefined();
    expect(allPlayers(s).some((p) => (p.ratingLog?.length ?? 0) > 0)).toBe(true);
    // A fired manager takes the first offer, as the End screen would ask.
    const review = seasonReview(s);
    const turned = nextSeason(s, review.user?.verdict === "fired" ? review.jobOffers[0] : undefined).state;
    expect(turned.season).toBe(s.season + 1);
  }, 60_000);
});
