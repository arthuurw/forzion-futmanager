import { AI_FORMATION, autoLineup, starters, validateLineup } from "./lineup";
import { simulateMatch, type TeamSheet } from "./match";
import { createRng } from "./rng";
import type { Club, GameState, League, MatchEvent, MatchResult } from "./types";

export interface RoundOutcome {
  state: GameState;
  /** Round number just played (1-based). */
  roundNumber: number;
  /** Full event log of the user's match, in minute order. Not persisted (door 7). */
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

function sheetFor(club: Club, isUser: boolean): TeamSheet {
  // AI clubs always field their best eleven in 4-4-2 (AC 24). The user's lineup must already be valid.
  const lineup = isUser && club.lineup && validateLineup(club, club.lineup).ok ? club.lineup : autoLineup(club, AI_FORMATION);
  return { clubId: club.id, starters: starters(club, lineup) };
}

/** Simulates the next round of the user's league. Pure: returns a new state, never mutates. */
export function playRound(input: GameState): RoundOutcome {
  // The save is plain JSON, so a JSON round-trip is a faithful deep copy without DOM globals (door 3).
  const state = JSON.parse(JSON.stringify(input)) as GameState;
  const league = userLeague(state);
  if (isSeasonOver(league)) throw new Error("season is over");
  const round = league.rounds[league.currentRound];
  if (!round) throw new Error("round missing");

  const rng = createRng(state.rngState);
  let userEvents: MatchEvent[] = [];
  const results: RoundOutcome["results"] = [];

  for (const match of round.matches) {
    const home = findClub(league, match.homeId);
    const away = findClub(league, match.awayId);
    const sim = simulateMatch(sheetFor(home, home.id === state.userClubId), sheetFor(away, away.id === state.userClubId), rng);
    match.result = sim.result;
    results.push({ matchId: match.id, homeId: match.homeId, awayId: match.awayId, result: sim.result });
    if (match.homeId === state.userClubId || match.awayId === state.userClubId) userEvents = sim.events;
  }

  league.currentRound++;
  state.rngState = rng.getState();
  return { state, roundNumber: round.number, userEvents, results };
}
