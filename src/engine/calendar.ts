/**
 * Door 4 (copa-nacional): the season's dates are not stored. The next one follows from each
 * league's `currentRound` and each cup's `currentPhase`.
 */
import { LEAGUE, type Competition, type GameState } from "./types";

/** The league round (1-based) each cup phase comes right after. */
export const CUP_AFTER_ROUNDS = [4, 10, 16, 22, 28, 34] as const;

export type GameDate = { kind: "cup"; cupIndex: number; phase: number } | { kind: "league"; roundIndex: number } | { kind: "over" };

/** A cup phase whose anchor round is played comes first; then the next league round; then nothing. */
export function nextDate(state: Pick<GameState, "leagues" | "cups">): GameDate {
  const league = state.leagues[0];
  const played = league?.currentRound ?? 0;
  for (const [cupIndex, cup] of state.cups.entries()) {
    const phase = cup.phases[cup.currentPhase];
    if (phase && phase.afterLeagueRound <= played) return { kind: "cup", cupIndex, phase: cup.currentPhase };
  }
  if (league && played < league.rounds.length) return { kind: "league", roundIndex: played };
  return { kind: "over" };
}

/** Whose discipline the date reads (door 6). */
export function competitionOf(state: Pick<GameState, "cups">, date: GameDate): Competition {
  if (date.kind !== "cup") return LEAGUE;
  const cup = state.cups[date.cupIndex];
  return cup ? { kind: "cup", cupId: cup.id } : LEAGUE;
}

/** The competition of the next date to play. */
export function nextCompetition(state: Pick<GameState, "leagues" | "cups">): Competition {
  return competitionOf(state, nextDate(state));
}
