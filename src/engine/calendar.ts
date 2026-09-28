/**
 * Door 4 (copa-nacional): the season's dates are not stored. The next one follows from each
 * league's `currentRound` and each cup's `currentPhase`.
 */
import { LEAGUE, type Competition, type GameState } from "./types";

/** The league round (1-based) each cup phase comes right after. */
export const CUP_AFTER_ROUNDS = [4, 10, 16, 22, 28, 34] as const;
/** Copa-continental AC 9: the continental cup's phases, never on a national cup's date. */
export const CONTINENTAL_AFTER_ROUNDS = [7, 13, 25, 31] as const;

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

/**
 * The competition of the user's next match, whose discipline the user's lineup reads (ajustes-4a
 * AC 1-4): a cup date the user's club has no tie in - eliminated, or not in the Preliminar - reads
 * the league, the user's next match.
 */
export function nextCompetition(state: Pick<GameState, "leagues" | "cups" | "userClubId">): Competition {
  const date = nextDate(state);
  if (date.kind === "cup") {
    const ties = state.cups[date.cupIndex]?.phases[date.phase]?.ties ?? [];
    if (!ties.some((t) => t.homeId === state.userClubId || t.awayId === state.userClubId)) return LEAGUE;
  }
  return competitionOf(state, date);
}
