import { migrateSave } from "./migrate";
import { v1Document, v2Document } from "./test-fixtures";
import type { GameState } from "./types";

/** Written out here, not imported (L-004). */
const expectedSalary = (rating: number) => Math.round((2000 * 1.09 ** (rating - 40)) / 100) * 100;
const expectedFans = (mean: number) => Math.round(Math.min(60_000, Math.max(15_000, 15_000 + (45_000 * (mean - 58)) / 22)) / 1000) * 1000;

type Doc = { leagues: { clubs: { id: string; players: { id: string; rating: number }[] }[]; rounds: unknown }[] };

function expectV3(state: GameState, doc: Doc) {
  expect(state.schemaVersion).toBe(3);
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

describe("migração do save", () => {
  // Supersedes partida-ao-vivo C42 (v1 -> v2): v1 now goes straight to v3 with the same condition defaults.
  test("migra v2 e v1 para v3", () => {
    const v2 = v2Document();
    const fromV2 = migrateSave(v2);
    if (fromV2.kind !== "ok") throw new Error("v2 not migrated");
    expectV3(fromV2.state, v2 as unknown as Doc);

    const v1 = v1Document();
    const fromV1 = migrateSave(v1);
    if (fromV1.kind !== "ok") throw new Error("v1 not migrated");
    expectV3(fromV1.state, v1 as unknown as Doc);
    for (const club of fromV1.state.leagues[0]!.clubs) {
      for (const p of club.players) {
        expect(p).toMatchObject({ fitness: 100, morale: 0, injuryRounds: 0, suspendedRounds: 0, yellowCards: 0, idleRounds: 0 });
      }
    }
    const user = fromV1.state.leagues[0]!.clubs.find((c) => c.id === fromV1.state.userClubId)!;
    expect(user.lineup).toMatchObject({ formation: "4-3-3", posture: "balanced" });

    // Same seed, same free agents; v3 passes through; anything newer is refused.
    expect(fromV1.state.market.freeAgents).toEqual(fromV2.state.market.freeAgents);
    expect(migrateSave(fromV2.state)).toEqual({ kind: "ok", state: fromV2.state });
    expect(migrateSave({ schemaVersion: 4 })).toEqual({ kind: "incompatible", version: 4 });
  });
});
