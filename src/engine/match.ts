import { makeMatch, makeSide, resultOf, stepMatch, MATCH_MINUTES, type LivePlayer } from "./live";
import type { Rng } from "./rng";
import type { MatchEvent, MatchResult, PlayerCore, Posture } from "./types";

/** Everything the one-shot simulator needs to know about one side: eleven players in their own positions. */
export interface TeamSheet {
  clubId: string;
  starters: (PlayerCore & Partial<LivePlayer>)[];
  posture?: Posture;
}

export interface SimulatedMatch {
  result: MatchResult;
  events: MatchEvent[];
}

/**
 * A full match in one call, on the same minute-by-minute engine as the live round (AD-007).
 * No bench: an injured or sent-off player is not replaced. Deterministic for a given Rng state.
 */
export function simulateMatch(home: TeamSheet, away: TeamSheet, rng: Rng): SimulatedMatch {
  const players: Record<string, LivePlayer> = {};
  for (const p of [...home.starters, ...away.starters]) players[p.id] = p;
  const side = (s: TeamSheet) =>
    makeSide(
      s.clubId,
      s.starters.map((p) => p.position),
      s.starters.map((p) => p.id),
      [],
      players,
      { posture: s.posture ?? "balanced" },
    );
  const m = makeMatch("single", side(home), side(away), 0);
  for (let minute = 1; minute <= MATCH_MINUTES; minute++) stepMatch(m, minute, players, rng);
  return { result: resultOf(m), events: m.events };
}
