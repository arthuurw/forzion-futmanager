import { newGame } from "./generate";
import { migrateSave } from "./migrate";
import { v1Document, v2Document, v3Document } from "./test-fixtures";
import type { GameState } from "./types";

/** Written out here, not imported (L-004). */
const expectedSalary = (rating: number) => Math.round((2000 * 1.09 ** (rating - 40)) / 100) * 100;
const expectedFans = (mean: number) => Math.round(Math.min(60_000, Math.max(15_000, 15_000 + (45_000 * (mean - 58)) / 22)) / 1000) * 1000;

type Doc = { leagues: { clubs: { id: string; players: { id: string; rating: number }[] }[]; rounds: unknown }[] };

function expectV4Finances(state: GameState, doc: Doc) {
  expect(state.schemaVersion).toBe(4);
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
      JSON.parse(JSON.stringify(x), (k, v) => (["contractSeasons", "seasonGames", "seasonGoals", "careerGames", "careerGoals"].includes(k) ? undefined : v));
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

  test("v4 passa direto", () => {
    const r = migrateSave(v3Document(5, 2));
    if (r.kind !== "ok") throw new Error("v3 not migrated");
    const copy = JSON.parse(JSON.stringify(r.state));
    expect(migrateSave(copy)).toEqual({ kind: "ok", state: r.state });
    expect(migrateSave({ schemaVersion: 5 })).toEqual({ kind: "incompatible", version: 5 });
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
});
