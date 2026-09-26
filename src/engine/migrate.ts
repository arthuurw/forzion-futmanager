import { generateFreeAgents, takenNames } from "./generate";
import { initialFinance, salaryFor } from "./finance";
import { createRng, mix32 } from "./rng";
import { FRESH_CONDITION, SCHEMA_VERSION, type GameState, type League, type Player } from "./types";

export type MigrationResult = { kind: "ok"; state: GameState } | { kind: "incompatible"; version: unknown };

interface OldPlayer {
  rating: number;
  [key: string]: unknown;
}
interface OldClub {
  players: OldPlayer[];
  lineup: { [key: string]: unknown } | null;
  [key: string]: unknown;
}
interface OldDocument {
  seed: number;
  leagues: { clubs: OldClub[] }[];
  [key: string]: unknown;
}

/** v1 -> v2 (partida-ao-vivo AC 42): fresh condition on every player, balanced posture on every lineup. */
function v1ToV2(doc: OldDocument): void {
  for (const league of doc.leagues) {
    for (const club of league.clubs) {
      club.players = club.players.map((p) => ({ ...FRESH_CONDITION, ...p }));
      if (club.lineup) club.lineup = { posture: "balanced", ...club.lineup };
    }
  }
}

/**
 * v2 -> v3 (AC 51): salaries by the formula, finances as in a new game, 40 free agents drawn from
 * the seed (door 3: `mix32(seed, 3)`), no offers and no juniors.
 */
function v2ToV3(doc: OldDocument): GameState {
  for (const league of doc.leagues) {
    for (const club of league.clubs) {
      club.players = club.players.map((p) => ({ ...p, salary: salaryFor(p.rating) }));
      club.finance = initialFinance(club.players as unknown as Player[]);
      club.forSale = [];
    }
  }
  const leagues = doc.leagues as unknown as League[];
  const freeAgents = generateFreeAgents(createRng(mix32(doc.seed, 3)), takenNames({ leagues }));
  return { ...(doc as unknown as GameState), schemaVersion: SCHEMA_VERSION, market: { freeAgents, juniors: [], offers: [] } };
}

/**
 * Door 1: reads any stored document. v3 passes through; v2 and v1 migrate forward (AC 51);
 * anything else is incompatible (AC 52).
 */
export function migrateSave(doc: unknown): MigrationResult {
  const version = typeof doc === "object" && doc !== null ? (doc as { schemaVersion?: unknown }).schemaVersion : undefined;
  if (version === SCHEMA_VERSION) return { kind: "ok", state: doc as GameState };
  if (version !== 1 && version !== 2) return { kind: "incompatible", version };
  const old = JSON.parse(JSON.stringify(doc)) as OldDocument;
  if (version === 1) v1ToV2(old);
  return { kind: "ok", state: v2ToV3(old) };
}
