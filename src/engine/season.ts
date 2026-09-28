import { DIVISION_LABEL, combinedVerdict, divisionAt, divisionOf, jobOffers, verdictFor } from "./board";
import { nextDate } from "./calendar";
import { cupChampion, cupReached, cupRunnerUp, finishCupDate, startCupDate } from "./cup";
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
  /** Every result of the user's division this round, in schedule order; every tie of a cup date, in draw order. */
  results: { matchId: string; homeId: string; awayId: string; result: MatchResult; penalties?: { home: number; away: number } | null }[];
  /** Set when the date was a cup phase (copa-nacional). */
  cup?: { cupIndex: number; phase: number };
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

  state.leagues.forEach((league) => {
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
    // AC 29: the last round also pays the prize for the final position; paises AC 9: by the league's tier.
    const prizes = isSeasonOver(league)
      ? new Map(computeTable(league).map((row, k) => [row.clubId, prizeFor(league.tier, k + 1)]))
      : null;
    closeRoundFinances(league.clubs, round.matches, positions, league.tier, prizes, state.userClubId);
  });

  closeRoundMarket(state, state.rngState, roundNumber);
  const rng = createRng(state.rngState);
  rng.next();
  state.rngState = rng.getState();

  return { state, roundNumber, userEvents: userMatch(live)?.events ?? [], results };
}

/** One date with no decisions, league round or cup phase (copa-nacional door 4). */
export function playDate(input: GameState): RoundOutcome {
  const date = nextDate(input);
  if (date.kind === "over") throw new Error("season is over");
  if (date.kind === "cup") return finishCupDate(input, startCupDate(input));
  return finishRound(input, startRound(input));
}

/** The cup dates due, then one league round with no decisions: 38 calls are still a whole season. */
export function playRound(input: GameState): RoundOutcome {
  if (isSeasonOver(userLeague(input))) throw new Error("season is over");
  let state = input;
  while (nextDate(state).kind === "cup") state = playDate(state).state;
  return finishRound(state, startRound(state));
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

export interface CupReview {
  cupId: string;
  name: string;
  championId: string | null;
  runnerUpId: string | null;
  /** Phase index the user reached, the cup's number of phases = champion; null without a club. */
  userReached: number | null;
}

export interface SeasonReview {
  season: number;
  divisions: DivisionReview[];
  cups: CupReview[];
  /**
   * Null when there is no user club. `verdict` is the league's adjusted by the cup goal
   * (copa-nacional AC 37-39); `leagueVerdict` is the league's alone.
   */
  user: {
    divisionIndex: number;
    position: number;
    prize: number;
    goal: number;
    leagueVerdict: Verdict;
    cupGoal: number;
    verdict: Verdict;
  } | null;
  /** AC 34: clubs offering a job; empty unless the user was fired. */
  jobOffers: string[];
}

/** AC 9, AC 38: what the season that just ended looks like. Depends only on the state, so a reload shows the same (AC 15). */
export function seasonReview(state: GameState): SeasonReview {
  const divisions = state.leagues.map((league, i): DivisionReview => {
    const table = computeTable(league);
    // Paises AC 11, AC 12: up and down only between consecutive tiers of the same country.
    const role = divisionAt(state.leagues, i);
    return {
      leagueId: league.id,
      label: DIVISION_LABEL[i] ?? league.name,
      table,
      championId: table[0]!.clubId,
      promotedIds: role.promotes ? table.slice(0, PROMOTED_PER_SEASON).map((r) => r.clubId) : [],
      relegatedIds: role.relegates ? table.slice(-PROMOTED_PER_SEASON).map((r) => r.clubId) : [],
      topScorer: topScorers(league, 1)[0] ?? null,
    };
  });
  const userId = state.userClubId;
  const cups = state.cups.map(
    (cup): CupReview => ({
      cupId: cup.id,
      name: cup.name,
      championId: cupChampion(cup),
      runnerUpId: cupRunnerUp(cup),
      userReached: userId ? cupReached(cup, userId) : null,
    }),
  );
  let user: SeasonReview["user"] = null;
  if (userId) {
    const divisionIndex = divisionOf(state, userId);
    const position = divisions[divisionIndex]!.table.findIndex((r) => r.clubId === userId) + 1;
    const leagueVerdict = verdictFor(divisionAt(state.leagues, divisionIndex), state.boardGoal, position);
    user = {
      divisionIndex,
      position,
      prize: prizeFor(state.leagues[divisionIndex]!.tier, position),
      goal: state.boardGoal,
      leagueVerdict,
      cupGoal: state.cupGoal,
      verdict: combinedVerdict(leagueVerdict, state.cupGoal, cups[0]?.userReached ?? null),
    };
  }
  return { season: state.season, divisions, cups, user, jobOffers: user?.verdict === "fired" ? jobOffers(state) : [] };
}
