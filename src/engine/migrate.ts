import { FRESH_CONDITION, SCHEMA_VERSION, type GameState } from "./types";

export type MigrationResult = { kind: "ok"; state: GameState } | { kind: "incompatible"; version: unknown };

interface V1Player {
  [key: string]: unknown;
}
interface V1Club {
  players: V1Player[];
  lineup: { [key: string]: unknown } | null;
  [key: string]: unknown;
}

/**
 * Door 1: reads any stored document. v2 passes through; v1 gains fresh condition on every player
 * and a balanced posture on every lineup (AC 42); anything else is incompatible (AC 43).
 */
export function migrateSave(doc: unknown): MigrationResult {
  const version = typeof doc === "object" && doc !== null ? (doc as { schemaVersion?: unknown }).schemaVersion : undefined;
  if (version === SCHEMA_VERSION) return { kind: "ok", state: doc as GameState };
  if (version !== 1) return { kind: "incompatible", version };
  const v1 = JSON.parse(JSON.stringify(doc)) as { leagues: { clubs: V1Club[] }[]; [key: string]: unknown };
  for (const league of v1.leagues) {
    for (const club of league.clubs) {
      club.players = club.players.map((p) => ({ ...FRESH_CONDITION, ...p }));
      if (club.lineup) club.lineup = { posture: "balanced", ...club.lineup };
    }
  }
  return { kind: "ok", state: { ...(v1 as unknown as GameState), schemaVersion: SCHEMA_VERSION } };
}
