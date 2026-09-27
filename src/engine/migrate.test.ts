import { nextDate } from "./calendar";
import { newGame } from "./generate";
import { aiLineup, formationSlots, isAvailable } from "./lineup";
import { makeMatch, makeSide, runToEnd, type LivePlayer } from "./live";
import { createRng, mix32, randInt } from "./rng";
import { migrateSave } from "./migrate";
import { expectedCupGoal, v1Document, v2Document, v3Document, v4Document } from "./test-fixtures";
import type { GameState } from "./types";

/** Written out here, not imported (L-004). */
const expectedSalary = (rating: number) => Math.round((2000 * 1.09 ** (rating - 40)) / 100) * 100;
const expectedFans = (mean: number) => Math.round(Math.min(60_000, Math.max(15_000, 15_000 + (45_000 * (mean - 58)) / 22)) / 1000) * 1000;

type Doc = { leagues: { clubs: { id: string; players: { id: string; rating: number }[] }[]; rounds: unknown }[] };

// Copa-nacional C60 supersedes multiplas-temporadas C48, C49: v3, v2 and v1 reach v5 through v4.
function expectV4Finances(state: GameState, doc: Doc) {
  expect(state.schemaVersion).toBe(5);
  const league = state.leagues[0]!;
  expect(league.rounds).toEqual(doc.leagues[0]!.rounds);
  league.clubs.forEach((club, i) => {
    const old = doc.leagues[0]!.clubs[i]!;
    expect(club.players.map((p) => [p.id, p.rating])).toEqual(old.players.map((p) => [p.id, p.rating]));
    for (const p of club.players) expect(p.salary, p.id).toBe(expectedSalary(p.rating));
    const wages = club.players.reduce((s, p) => s + expectedSalary(p.rating), 0);
    const fans = expectedFans(club.players.reduce((s, p) => s + p.rating, 0) / club.players.length);
    expect(club.finance).toMatchObject({
      cash: Math.round((wages * 10) / 100_000) * 100_000,
      fans,
      capacity: Math.round((fans * 0.8) / 1000) * 1000,
      ticketPrice: 40,
      loan: 0,
      expansionRoundsLeft: 0,
      lastRound: null,
    });
    expect(club.forSale).toEqual([]);
  });
  expect(state.market.freeAgents).toHaveLength(40);
  expect(state.market.offers).toEqual([]);
  expect(state.market.juniors).toEqual([]);
}

const best11 = (players: { rating: number }[]) =>
  [...players].map((p) => p.rating).sort((a, b) => b - a).slice(0, 11).reduce((a, b) => a + b, 0) / 11;

/** AC 30, written out: rank by the best eleven in the division, ties by id; Série A goal min(16, r + 3). */
function expectedGoalA(state: GameState): number {
  const ranking = [...state.leagues[0]!.clubs].sort((a, b) => best11(b.players) - best11(a.players) || a.id.localeCompare(b.id));
  return Math.min(16, ranking.findIndex((c) => c.id === state.userClubId) + 1 + 3);
}

/** What every v4 migration adds: the Série B caught up, contracts, zeroed numbers, history, goal. */
function expectV4Additions(state: GameState, roundsPlayed: number) {
  expect(state.leagues.map((l) => l.id)).toEqual(["l1", "l2"]);
  const b = state.leagues[1]!;
  expect(new Set(b.clubs.map((c) => c.id))).toEqual(new Set(Array.from({ length: 20 }, (_, i) => `c${21 + i}`)));
  expect(b.rounds).toHaveLength(38);
  expect(b.currentRound).toBe(roundsPlayed);
  b.rounds.forEach((r, i) => {
    for (const m of r.matches) expect(m.result === null, `rodada ${i + 1}`).toBe(i >= roundsPlayed);
  });
  const contracts = new Set<number>();
  for (const league of state.leagues) {
    for (const c of league.clubs) {
      for (const p of c.players) {
        expect(Number.isInteger(p.contractSeasons) && p.contractSeasons >= 1 && p.contractSeasons <= 4, p.id).toBe(true);
        if (league === state.leagues[0]) contracts.add(p.contractSeasons);
        expect([p.seasonGames, p.seasonGoals, p.careerGames, p.careerGoals], p.id).toEqual([0, 0, 0, 0]);
      }
    }
  }
  expect([...contracts].sort()).toEqual([1, 2, 3, 4]);
  for (const p of [...state.market.freeAgents, ...state.market.juniors]) {
    expect([p.contractSeasons, p.seasonGames, p.seasonGoals, p.careerGames, p.careerGoals], p.id).toEqual([0, 0, 0, 0, 0]);
  }
  expect(state.history).toEqual([]);
  expect(state.boardGoal).toBe(expectedGoalA(state));
}

describe("migração do save", () => {
  test("migra v3 para v4", () => {
    const v3 = v3Document(4, 5);
    const r = migrateSave(v3);
    if (r.kind !== "ok") throw new Error("v3 not migrated");
    const state = r.state;
    const oldA = (v3 as unknown as { leagues: GameState["leagues"] }).leagues[0]!;
    const a = state.leagues[0]!;
    // The Série A is the same save, plus contracts and zeroed numbers.
    const withoutV4 = (x: unknown) =>
      JSON.parse(JSON.stringify(x), (k, v) => (["contractSeasons", "seasonGames", "seasonGoals", "careerGames", "careerGoals", "cupDiscipline"].includes(k) ? undefined : v));
    expect(withoutV4(a)).toEqual(oldA);
    expect(a.currentRound).toBe(5);
    expect(withoutV4(state.market)).toEqual((v3 as { market: unknown }).market);
    expect(state.userClubId).toBe((v3 as { userClubId: string }).userClubId);
    expect(state.rngState).toBe((v3 as { rngState: number }).rngState);
    expectV4Additions(state, 5);
  });

  // Supersedes elenco-mercado-financas C51 (v2 and v1 to v3): they now reach v4.
  test("migra v2 e v1 para v4", () => {
    const v2 = v2Document();
    const fromV2 = migrateSave(v2);
    if (fromV2.kind !== "ok") throw new Error("v2 not migrated");
    expectV4Finances(fromV2.state, v2 as unknown as Doc);
    expectV4Additions(fromV2.state, 0);

    const v1 = v1Document();
    const fromV1 = migrateSave(v1);
    if (fromV1.kind !== "ok") throw new Error("v1 not migrated");
    expectV4Finances(fromV1.state, v1 as unknown as Doc);
    expectV4Additions(fromV1.state, 0);
    for (const club of fromV1.state.leagues[0]!.clubs) {
      for (const p of club.players) {
        expect(p).toMatchObject({ fitness: 100, morale: 0, injuryRounds: 0, suspendedRounds: 0, yellowCards: 0, idleRounds: 0 });
      }
    }
    const user = fromV1.state.leagues[0]!.clubs.find((c) => c.id === fromV1.state.userClubId)!;
    expect(user.lineup).toMatchObject({ formation: "4-3-3", posture: "balanced" });
    // Same seed, same free agents.
    expect(fromV1.state.market.freeAgents).toEqual(fromV2.state.market.freeAgents);
  });

  // Copa-nacional C56, C61 supersede multiplas-temporadas C50, C51: v5 is current, v4 migrates, 6 is incompatible.
  test("v5 passa direto", () => {
    const r = migrateSave(v3Document(5, 2));
    if (r.kind !== "ok") throw new Error("v3 not migrated");
    expect(r.state.schemaVersion).toBe(5);
    const copy = JSON.parse(JSON.stringify(r.state));
    expect(migrateSave(copy)).toEqual({ kind: "ok", state: r.state });
    expect(migrateSave({ schemaVersion: 6 })).toEqual({ kind: "incompatible", version: 6 });
  });

  test("série B migrada vem da seed", () => {
    const doc = v3Document(6, 3);
    const a = migrateSave(JSON.parse(JSON.stringify(doc)));
    const b = migrateSave(JSON.parse(JSON.stringify(doc)));
    if (a.kind !== "ok" || b.kind !== "ok") throw new Error("not migrated");
    expect(a.state).toEqual(b.state);
    // Door 5: the Série B is the same league a new game of this seed gets, before its scores.
    const clubsAndSchedule = (l: GameState["leagues"][number]) => ({
      clubs: l.clubs.map((c) => [c.id, c.name]),
      fixtures: l.rounds.map((r) => r.matches.map((m) => [m.homeId, m.awayId])),
    });
    expect(clubsAndSchedule(a.state.leagues[1]!)).toEqual(clubsAndSchedule(newGame(6).leagues[1]!));
    // A different seed in the same document gives different scores.
    const other = migrateSave({ ...JSON.parse(JSON.stringify(doc)), seed: 7 });
    if (other.kind !== "ok") throw new Error("not migrated");
    const scores = (s: GameState) => s.leagues[1]!.rounds.slice(0, 3).flatMap((r) => r.matches.map((m) => m.result));
    expect(scores(other.state)).not.toEqual(scores(a.state));
  });

  test("partidas migradas da série B usam a semente da porta 5", () => {
    const seed = 8;
    const r = migrateSave(v3Document(seed, 2));
    if (r.kind !== "ok") throw new Error("not migrated");
    const b = r.state.leagues[1]!;
    // Replay round 1 of the Série B here, as scores only, with the seed written out.
    const players: Record<string, LivePlayer> = {};
    for (const c of b.clubs) for (const p of c.players) players[p.id] = { ...p };
    const clubs = new Map(b.clubs.map((c) => [c.id, c]));
    const side = (id: string) => {
      const club = clubs.get(id)!;
      const lineup = aiLineup(club);
      const starters = lineup.starters.map((pid) => (pid && isAvailable(club.players.find((p) => p.id === pid)!) ? pid : null));
      return makeSide(id, formationSlots(lineup.formation), starters, club.players.filter((p) => !starters.includes(p.id)).map((p) => p.id), players, { formation: lineup.formation });
    };
    const replay = (n: number, seedOf: (i: number) => number) =>
      runToEnd({
        roundIndex: n - 1,
        roundNumber: n,
        minute: 0,
        userClubId: null,
        players,
        matches: b.rounds[n - 1]!.matches.map((m, i) => makeMatch(m.id, side(m.homeId), side(m.awayId), seedOf(i), "l2")),
      }).matches.map((m) => [m.homeGoals, m.awayGoals]);
    // Both rounds already played, so the round number n is part of what is pinned.
    for (const n of [1, 2]) {
      const stored = b.rounds[n - 1]!.matches.map((m) => [m.result!.homeGoals, m.result!.awayGoals]);
      expect(stored, `rodada ${n}`).toEqual(replay(n, (i) => mix32(mix32(seed, 0xb), n * 16 + i)));
      // The Série A scheme (rejected in door 2) would give other scores.
      expect(stored, `rodada ${n}`).not.toEqual(replay(n, (i) => mix32(seed, n * 16 + i)));
    }
  });

  test("contratos migrados da série A vêm de mix32(seed, 5)", () => {
    const seed = 9;
    const r = migrateSave(v3Document(seed, 0));
    if (r.kind !== "ok") throw new Error("not migrated");
    const rng = createRng(mix32(seed, 5));
    const expected = r.state.leagues[0]!.clubs.flatMap((c) => c.players.map(() => randInt(rng, 1, 4)));
    expect(r.state.leagues[0]!.clubs.flatMap((c) => c.players.map((p) => p.contractSeasons))).toEqual(expected);
    const other = createRng(mix32(seed, 6));
    expect(expected).not.toEqual(expected.map(() => randInt(other, 1, 4)));
  });
});

const migrated = (doc: unknown): GameState => {
  const r = migrateSave(doc);
  if (r.kind !== "ok") throw new Error("not migrated");
  return r.state;
};
type V4Club = { id: string; finance: { cash: number }; players: Record<string, unknown>[] };
type V4Doc = { leagues: { clubs: V4Club[] }[]; market: { freeAgents: Record<string, unknown>[]; juniors: Record<string, unknown>[] } };
const CONDITION = ["fitness", "morale", "injuryRounds", "suspendedRounds", "yellowCards", "idleRounds"] as const;

describe("migração v4 -> v5 (copa-nacional)", () => {
  test("v4 na rodada 0 ganha preliminar", () => {
    const s = migrated(v4Document(92, 0));
    const cup = s.cups[0]!;
    expect(cup.id).toBe("cup-nat");
    expect(cup.currentPhase).toBe(0);
    expect(cup.phases[0]!.ties).toHaveLength(8);
    for (const t of cup.phases[0]!.ties) expect(t.result).toBeNull();
    for (const phase of cup.phases.slice(1)) expect(phase.ties).toEqual([]);
  });

  test("v4 no meio da temporada ganha copa", () => {
    const doc = v4Document(93, 12) as unknown as V4Doc;
    const s = migrated(JSON.parse(JSON.stringify(doc)));
    expect(s.schemaVersion).toBe(5);
    const cup = s.cups[0]!;
    for (const k of [0, 1]) {
      expect(cup.phases[k]!.ties).toHaveLength(k === 0 ? 8 : 16);
      for (const t of cup.phases[k]!.ties) {
        expect(t.result, t.id).not.toBeNull();
        expect([t.homeId, t.awayId]).toContain(t.winnerId);
      }
    }
    expect(cup.phases[2]!.ties).toHaveLength(8);
    for (const t of cup.phases[2]!.ties) expect([t.result, t.winnerId]).toEqual([null, null]);
    for (const phase of cup.phases.slice(3)) expect(phase.ties).toEqual([]);
    expect(cup.currentPhase).toBe(2);
    expect(nextDate(s)).toEqual({ kind: "league", roundIndex: 12 });
    // No money and no condition moved.
    const oldClubs = new Map(doc.leagues.flatMap((l) => l.clubs).map((c) => [c.id, c]));
    for (const c of s.leagues.flatMap((l) => l.clubs)) {
      const old = oldClubs.get(c.id)!;
      expect(c.finance.cash, c.id).toBe(old.finance.cash);
      c.players.forEach((p, i) => {
        for (const k of CONDITION) expect(p[k], `${p.id}.${k}`).toBe(old.players[i]![k]);
      });
    }
  });

  test("v4 no fim da temporada ganha copa decidida", () => {
    const s = migrated(v4Document(94, 38));
    const cup = s.cups[0]!;
    expect(cup.currentPhase).toBe(6);
    expect(cup.phases.map((p) => p.ties.length)).toEqual([8, 16, 8, 4, 2, 1]);
    for (const phase of cup.phases) for (const t of phase.ties) expect(t.winnerId, t.id).not.toBeNull();
    expect(nextDate(s)).toEqual({ kind: "over" });
  }, 60_000);

  test("campos novos da v5", () => {
    const doc = v4Document(95, 3, 1);
    expect((doc as { history: unknown[] }).history).toHaveLength(1);
    const s = migrated(doc);
    const players = [...s.leagues.flatMap((l) => l.clubs.flatMap((c) => c.players)), ...s.market.freeAgents, ...s.market.juniors];
    expect(s.market.juniors.length).toBeGreaterThan(0);
    for (const p of players) expect(p.cupDiscipline, p.id).toEqual({});
    expect(s.history).toHaveLength(1);
    for (const r of s.history) expect(r.cups).toEqual([]);
    expect(s.cupGoal).toBe(expectedCupGoal(s));
  }, 60_000);

  test("meta de copa na migração", () => {
    // A Série B club in the preliminary (goal 1) and the Série A club of the fixture.
    const base = v4Document(96, 0) as Record<string, unknown> & { leagues: { clubs: { id: string }[] }[]; userClubId: string };
    const fromA = migrated(JSON.parse(JSON.stringify(base)));
    expect(fromA.cupGoal).toBe(expectedCupGoal(fromA));
    const preliminary = fromA.cups[0]!.phases[0]!.ties[0]!.homeId;
    const fromB = migrated({ ...JSON.parse(JSON.stringify(base)), userClubId: preliminary });
    expect(fromB.cupGoal).toBe(1);
    const noClub = migrated({ ...JSON.parse(JSON.stringify(base)), userClubId: null });
    expect(noClub.cupGoal).toBe(-1);
  });

  test("v1 v2 e v3 viram v5", () => {
    for (const doc of [v1Document(), v2Document(), v3Document(3, 6)]) {
      const s = migrated(doc);
      expect(s.schemaVersion).toBe(5);
      expect(s.leagues).toHaveLength(2);
      const cup = s.cups[0]!;
      expect(cup.seeding).toHaveLength(40);
      expect(cup.phases[0]!.ties).toHaveLength(8);
      for (const p of s.leagues.flatMap((l) => l.clubs.flatMap((c) => c.players))) expect(p.cupDiscipline).toEqual({});
      expect(s.cupGoal).toBe(expectedCupGoal(s));
    }
    // v3 six rounds in: the preliminary (after round 4) is already played.
    expect(migrated(v3Document(3, 6)).cups[0]!.currentPhase).toBe(1);
  });

  test("versão acima de 5 incompatível", () => {
    expect(migrateSave({ schemaVersion: 6 })).toEqual({ kind: "incompatible", version: 6 });
    expect(migrateSave({ schemaVersion: "x" })).toEqual({ kind: "incompatible", version: "x" });
  });

  test("sementes da migração da copa", () => {
    const seed = 97;
    const s = migrated(v4Document(seed, 5));
    const cup = s.cups[0]!;
    // Door 3 over mix32(seed, 6): the preliminary's draw, written out.
    const rng = createRng(mix32(mix32(mix32(seed, 6), 0xd0), 0));
    const drawn = cup.seeding.slice(24);
    for (let i = drawn.length - 1; i > 0; i--) {
      const j = randInt(rng, 0, i);
      [drawn[i], drawn[j]] = [drawn[j]!, drawn[i]!];
    }
    const expectedPairs = Array.from({ length: 8 }, (_, i) => {
      const [a, b] = [drawn[2 * i]!, drawn[2 * i + 1]!];
      return cup.seeding.indexOf(a) > cup.seeding.indexOf(b) ? [a, b] : [b, a];
    });
    expect(cup.phases[0]!.ties.map((t) => [t.homeId, t.awayId])).toEqual(expectedPairs);

    // Door 2 over mix32(seed, 7): replay the preliminary here, scores only, AI elevens.
    const players: Record<string, LivePlayer> = {};
    const clubs = new Map(s.leagues.flatMap((l) => l.clubs).map((c) => [c.id, c]));
    for (const c of clubs.values()) for (const p of c.players) players[p.id] = { ...p };
    const side = (id: string) => {
      const club = clubs.get(id)!;
      const lineup = aiLineup(club);
      const starters = lineup.starters.map((pid) => (pid && isAvailable(club.players.find((p) => p.id === pid)!) ? pid : null));
      const bench = club.players.filter((p) => isAvailable(p) && !starters.includes(p.id)).map((p) => p.id);
      return makeSide(id, formationSlots(lineup.formation), starters, bench, players, { formation: lineup.formation });
    };
    const replay = (seedOf: (i: number) => number) =>
      runToEnd({
        roundIndex: 5,
        roundNumber: 5,
        minute: 0,
        userClubId: null,
        players,
        matches: cup.phases[0]!.ties.map((t, i) => ({ ...makeMatch(t.id, side(t.homeId), side(t.awayId), seedOf(i), "cup-nat"), knockout: true })),
      }).matches.map((m) => [m.homeGoals, m.awayGoals, m.penalties ?? null]);
    const stored = cup.phases[0]!.ties.map((t) => [t.result!.homeGoals, t.result!.awayGoals, t.penalties]);
    expect(stored).toEqual(replay((i) => mix32(mix32(mix32(seed, 7), 0xc0), i)));
    expect(stored).not.toEqual(replay((i) => mix32(mix32(mix32(seed, 6), 0xc0), i)));
  });
});
