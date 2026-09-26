import { migrateSave } from "./migrate";
import { v1Document } from "./test-fixtures";

describe("migração do save", () => {
  test("migra save v1 para v2", () => {
    const doc = v1Document();
    const r = migrateSave(doc);
    expect(r.kind).toBe("ok");
    if (r.kind !== "ok") return;
    expect(r.state.schemaVersion).toBe(2);
    for (const club of r.state.leagues[0]!.clubs) {
      for (const p of club.players) {
        expect(p).toMatchObject({ fitness: 100, morale: 0, injuryRounds: 0, suspendedRounds: 0, yellowCards: 0, idleRounds: 0 });
      }
    }
    const user = r.state.leagues[0]!.clubs.find((c) => c.id === r.state.userClubId)!;
    expect(user.lineup).toMatchObject({ formation: "4-3-3", posture: "balanced" });
    // Everything else is untouched.
    expect(r.state.leagues[0]!.rounds).toEqual((doc.leagues as { rounds: unknown }[])[0]!.rounds);
    expect(migrateSave({ schemaVersion: 3 })).toEqual({ kind: "incompatible", version: 3 });
    expect(migrateSave(r.state)).toEqual({ kind: "ok", state: r.state });
  });
});
