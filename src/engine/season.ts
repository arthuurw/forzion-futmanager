import { applyRound } from "./condition";
import { resultOf, runToEnd, startRound, userMatch, type LiveRound } from "./live";
import { createRng } from "./rng";
import type { Club, GameState, League, MatchEvent, MatchResult } from "./types";

export interface RoundOutcome {
  state: GameState;
  /** Round number just played (1-based). */
  roundNumber: number;
  /** Full event log of the user's match, in minute order. Not persisted (door 7 of the core). */
  userEvents: MatchEvent[];
  /** Every result of the round, in schedule order. */
  results: { matchId: string; homeId: string; awayId: string; result: MatchResult }[];
}

export function userLeague(state: GameState): League {
  const league = state.leagues[0];
  if (!league) throw new Error("save has no league");
  return league;
}

export function findClub(league: League, clubId: string): Club {
  const club = league.clubs.find((c) => c.id === clubId);
  if (!club) throw new Error(`unknown club ${clubId}`);
  return club;
}

export function isSeasonOver(league: League): boolean {
  return league.currentRound >= league.rounds.length;
}

/**
 * Closes a live round (door 3): plays any minutes left, writes the results, applies condition,
 * advances the round and the save's Rng once. Pure: returns a new state.
 */
export function finishRound(input: GameState, liveInput: LiveRound): RoundOutcome {
  const live = runToEnd(liveInput);
  const state = JSON.parse(JSON.stringify(input)) as GameState;
  const league = userLeague(state);
  const round = league.rounds[live.roundIndex];
  if (!round) throw new Error("round missing");

  const results: RoundOutcome["results"] = [];
  round.matches.forEach((match, i) => {
    const lm = live.matches[i];
    if (!lm || lm.matchId !== match.id) throw new Error("live round does not match the schedule");
    match.result = resultOf(lm);
    results.push({ matchId: match.id, homeId: match.homeId, awayId: match.awayId, result: match.result });
  });

  league.clubs = applyRound(league.clubs, live.matches);
  league.currentRound = live.roundIndex + 1;
  const rng = createRng(state.rngState);
  rng.next();
  state.rngState = rng.getState();

  return { state, roundNumber: round.number, userEvents: userMatch(live)?.events ?? [], results };
}

/** A round with no decisions: start, run to the end, finish. */
export function playRound(input: GameState): RoundOutcome {
  if (isSeasonOver(userLeague(input))) throw new Error("season is over");
  return finishRound(input, startRound(input));
}
