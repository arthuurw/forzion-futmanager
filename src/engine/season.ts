import { DIVISION_LABEL, divisionOf, jobOffers, verdictFor } from "./board";
import { applyRound } from "./condition";
import { closeRoundFinances, positionsBeforeRound, prizeFor } from "./finance";
import { resultOf, runToEnd, startRound, userMatch, type LiveRound } from "./live";
import { closeRoundMarket } from "./market";
import { createRng } from "./rng";
import { computeTable, type TableRow } from "./table";
import type { Club, GameState, League, MatchEvent, MatchResult, Verdict } from "./types";

/** AC 10: clubs that go up from the Série B and down from the Série A. */
export const PROMOTED_PER_SEASON = 4;

export interface RoundOutcome {
  state: GameState;
  /** Round number just played (1-based). */
  roundNumber: number;
  /** Full event log of the user's match, in minute order. Not persisted (door 7 of the core). */
  userEvents: MatchEvent[];
  /** Every result of the user's division this round, in schedule order. */
  results: { matchId: string; homeId: string; awayId: string; result: MatchResult }[];
}

/** The league the user's club plays in; the Série A when there is no user club. */
export function userLeague(state: GameState): League {
  const league = state.leagues.find((l) => l.clubs.some((c) => c.id === state.userClubId)) ?? state.leagues[0];
  if (!league) throw new Error("save has no league");
  return league;
}

export function findClub(league: League, clubId: string): Club {
  const club = league.clubs.find((c) => c.id === clubId);
  if (!club) throw new Error(`unknown club ${clubId}`);
  return club;
}

/** Every club of every division. */
export function allClubs(state: Pick<GameState, "leagues">): Club[] {
  return state.leagues.flatMap((l) => l.clubs);
}

/** A club in any division. */
export function findAnyClub(state: Pick<GameState, "leagues">, clubId: string): Club {
  const club = allClubs(state).find((c) => c.id === clubId);
  if (!club) throw new Error(`unknown club ${clubId}`);
  return club;
}

export function isSeasonOver(league: League): boolean {
  return league.currentRound >= league.rounds.length;
}

/**
 * Closes a live round (door 3): plays any minutes left, writes the results of both divisions,
 * applies condition, pays the round (and the prize after the last one), advances the round and
 * the save's Rng once. Pure: returns a new state.
 */
export function finishRound(input: GameState, liveInput: LiveRound): RoundOutcome {
  const live = runToEnd(liveInput);
  const state = JSON.parse(JSON.stringify(input)) as GameState;
  const shown = userLeague(state);
  const results: RoundOutcome["results"] = [];
  let roundNumber = live.roundNumber;

  state.leagues.forEach((league, division) => {
    const round = league.rounds[live.roundIndex];
    if (!round) throw new Error("round missing");
    roundNumber = round.number;
    const played = live.matches.filter((m) => m.leagueId === league.id);
    const positions = positionsBeforeRound(league);
    round.matches.forEach((match, i) => {
      const lm = played[i];
      if (!lm || lm.matchId !== match.id) throw new Error("live round does not match the schedule");
      match.result = resultOf(lm);
      if (league === shown) results.push({ matchId: match.id, homeId: match.homeId, awayId: match.awayId, result: match.result });
    });
    league.clubs = applyRound(league.clubs, played);
    league.currentRound = live.roundIndex + 1;
    // AC 29: the last round also pays the prize for the final position.
    const prizes = isSeasonOver(league)
      ? new Map(computeTable(league).map((row, k) => [row.clubId, prizeFor(division, k + 1)]))
      : null;
    closeRoundFinances(league.clubs, round.matches, positions, division, prizes);
  });

  closeRoundMarket(state, state.rngState, roundNumber);
  const rng = createRng(state.rngState);
  rng.next();
  state.rngState = rng.getState();

  return { state, roundNumber, userEvents: userMatch(live)?.events ?? [], results };
}

/** A round with no decisions: start, run to the end, finish. */
export function playRound(input: GameState): RoundOutcome {
  if (isSeasonOver(userLeague(input))) throw new Error("season is over");
  return finishRound(input, startRound(input));
}

export interface TopScorer {
  playerId: string;
  name: string;
  clubId: string;
  clubName: string;
  goals: number;
}

/** AC 39: the division's scorers this season, most goals first, then name. */
export function topScorers(league: League, limit = 10): TopScorer[] {
  return league.clubs
    .flatMap((c) => c.players.map((p) => ({ playerId: p.id, name: p.name, clubId: c.id, clubName: c.name, goals: p.seasonGoals })))
    .filter((s) => s.goals > 0)
    .sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name, "pt-BR"))
    .slice(0, limit);
}

export interface DivisionReview {
  leagueId: string;
  label: string;
  table: TableRow[];
  championId: string;
  promotedIds: string[];
  relegatedIds: string[];
  topScorer: TopScorer | null;
}

export interface SeasonReview {
  season: number;
  divisions: DivisionReview[];
  /** Null when there is no user club. */
  user: { divisionIndex: number; position: number; prize: number; goal: number; verdict: Verdict } | null;
  /** AC 34: clubs offering a job; empty unless the user was fired. */
  jobOffers: string[];
}

/** AC 9, AC 38: what the season that just ended looks like. Depends only on the state, so a reload shows the same (AC 15). */
export function seasonReview(state: GameState): SeasonReview {
  const last = state.leagues.length - 1;
  const divisions = state.leagues.map((league, i): DivisionReview => {
    const table = computeTable(league);
    return {
      leagueId: league.id,
      label: DIVISION_LABEL[i] ?? league.name,
      table,
      championId: table[0]!.clubId,
      promotedIds: i > 0 ? table.slice(0, PROMOTED_PER_SEASON).map((r) => r.clubId) : [],
      relegatedIds: i < last ? table.slice(-PROMOTED_PER_SEASON).map((r) => r.clubId) : [],
      topScorer: topScorers(league, 1)[0] ?? null,
    };
  });
  let user: SeasonReview["user"] = null;
  if (state.userClubId) {
    const divisionIndex = divisionOf(state, state.userClubId);
    const position = divisions[divisionIndex]!.table.findIndex((r) => r.clubId === state.userClubId) + 1;
    user = {
      divisionIndex,
      position,
      prize: prizeFor(divisionIndex, position),
      goal: state.boardGoal,
      verdict: verdictFor(divisionIndex, state.boardGoal, position),
    };
  }
  return { season: state.season, divisions, user, jobOffers: user?.verdict === "fired" ? jobOffers(state) : [] };
}
