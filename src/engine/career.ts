/**
 * Carreira-dinamica: the manager's reputation, the board's warnings and mid-season sacking, job
 * offers by reputation, and taking a club in the middle of a season. Doors 1 and 2 (AD-024).
 */
import { divisionAt, jobOffers, strengthRanking, userBoardGoal, verdictFor } from "./board";
import { nextCompetition } from "./calendar";
import { CONTINENTAL_CUP_ID, NATIONAL_CUP_ID } from "./cup";
import { AI_FORMATION, autoLineup } from "./lineup";
import { createRng, mix32, shuffle } from "./rng";
import { computeTable } from "./table";
import type { Club, GameState, League } from "./types";

/** AC 1: the reputation of a manager with no past. */
export const BASE_REPUTATION = 50;
/** AC 1: how many of the last seasons with a club count. */
const REPUTATION_SEASONS = 5;
const VERDICT_POINTS = { met: 6, missed: -3, fired: -8 } as const;
const FIRST_DIVISION_TITLE = 8;
const LOWER_DIVISION_TITLE = 4;
const CUP_TITLE: Readonly<Record<string, number>> = { [NATIONAL_CUP_ID]: 6, [CONTINENTAL_CUP_ID]: 10 };
/** AC 1: each sacking of the current season. */
const MID_SEASON_FIRED = -8;

/** AC 3: the first league round the board counts. */
export const FIRST_WARNING_ROUND = 10;
/** AC 3: the board stops counting this many rounds before the end. */
const LAST_ROUNDS_WITHOUT_WARNING = 4;
/** AC 5: this many rounds in a row in the firing zone and the user is fired. */
export const BOARD_PATIENCE = 4;

/** AC 16: offers are drawn among this many clubs, the strongest the reputation reaches. */
const OFFER_POOL = 8;
const OFFERS = 2;
/** Door 2: the salt of the offers' own stream. */
const OFFER_SALT = 0xca;

/** AC 1: 0..100, from the last 5 seasons with a club and this season's sackings. Never stored (door 1). */
export function managerReputation(state: Pick<GameState, "history" | "career" | "season" | "leagues">): number {
  const tierOf = new Map(state.leagues.map((l) => [l.id, l.tier]));
  let points = BASE_REPUTATION;
  for (const record of state.history.filter((r) => r.userClubId !== null).slice(-REPUTATION_SEASONS)) {
    const clubId = record.userClubId!;
    if (record.verdict) points += VERDICT_POINTS[record.verdict];
    const league = record.divisions.find((d) => d.leagueId === record.userLeagueId);
    if (league?.championId === clubId) points += (tierOf.get(league.leagueId) ?? 0) === 0 ? FIRST_DIVISION_TITLE : LOWER_DIVISION_TITLE;
    for (const cup of record.cups) if (cup.championId === clubId) points += CUP_TITLE[cup.cupId] ?? 0;
  }
  for (const move of state.career ?? []) if (move.reason === "fired" && move.season === state.season) points += MID_SEASON_FIRED;
  return Math.max(0, Math.min(100, points));
}

/** The league a club plays in. */
function leagueOf(state: Pick<GameState, "leagues">, clubId: string): League | undefined {
  return state.leagues.find((l) => l.clubs.some((c) => c.id === clubId));
}

/** 1-based place of a club in its league's table now. */
function positionOf(league: League, clubId: string): number {
  return computeTable(league).findIndex((r) => r.clubId === clubId) + 1;
}

/**
 * AC 16, door 2: up to 2 clubs stronger than the user's that the reputation reaches, drawn among
 * the 8 strongest of them by the offers' own stream; the save's `rngState` is not advanced.
 */
export function reputationOffers(state: GameState, round: number): string[] {
  const userId = state.userClubId;
  if (!userId) return [];
  const ranking = strengthRanking(state.leagues.flatMap((l) => l.clubs));
  const n = ranking.length;
  const ceiling = Math.max(1, n - Math.floor((managerReputation(state) * n) / 100));
  const userRank = ranking.indexOf(userId) + 1;
  const pool = ranking.slice(ceiling - 1, Math.max(ceiling - 1, userRank - 1)).slice(0, OFFER_POOL);
  if (pool.length === 0) return [];
  const rng = createRng(mix32(mix32(state.rngState, OFFER_SALT), state.season * 64 + round));
  return shuffle(rng, pool).slice(0, OFFERS);
}

/**
 * AC 3-5, AC 17: what the board makes of the league round `round` that just closed. Counts the
 * rounds in a row in the firing zone and fires on the fourth; at the middle round, a user on
 * target gets the offers of better clubs. Pure: returns a new state.
 */
export function boardAfterRound(state: GameState, round: number): GameState {
  const userId = state.userClubId;
  const league = userId ? leagueOf(state, userId) : undefined;
  if (!userId || !league) return state;
  const rounds = league.rounds.length;
  const position = positionOf(league, userId);
  const division = divisionAt(state.leagues, state.leagues.indexOf(league));
  const counted = round >= FIRST_WARNING_ROUND && round <= rounds - LAST_ROUNDS_WITHOUT_WARNING;
  const inZone = verdictFor(division, state.boardGoal, position) === "fired";
  let warnings = counted && inZone ? (state.boardWarnings ?? 0) + 1 : 0;
  let pendingJob = state.pendingJob;
  if (warnings >= BOARD_PATIENCE) {
    pendingJob = { reason: "fired", clubIds: jobOffers(state) };
    warnings = 0;
  } else if (!pendingJob && round === Math.floor(rounds / 2) && position <= state.boardGoal) {
    const clubIds = reputationOffers(state, round);
    if (clubIds.length > 0) pendingJob = { reason: "offer", clubIds };
  }
  const next: GameState = { ...state, boardWarnings: warnings };
  if (pendingJob) next.pendingJob = pendingJob;
  else delete next.pendingJob;
  return next;
}

/** AC 19: a date that closes turns down an offer nobody answered. */
export function dropOffer(state: GameState): void {
  if (state.pendingJob?.reason === "offer") delete state.pendingJob;
}

/** AC 11: the club the manager leaves is the AI's: no lineup, normal training, nothing for sale. */
export function leaveClub(club: Club): void {
  club.lineup = null;
  club.forSale = [];
  delete club.training;
}

export type TakeJobResult = { ok: true; state: GameState } | { ok: false };

/**
 * AC 10-14: the user takes one of the pending offers now, in the middle of the season. Pure.
 */
export function takeJob(input: GameState, clubId: string): TakeJobResult {
  const job = input.pendingJob;
  const fromId = input.userClubId;
  if (!job || !fromId || clubId === fromId || !job.clubIds.includes(clubId)) return { ok: false };
  const state = JSON.parse(JSON.stringify(input)) as GameState;
  const clubs = state.leagues.flatMap((l) => l.clubs);
  const old = clubs.find((c) => c.id === fromId);
  const club = clubs.find((c) => c.id === clubId);
  const league = leagueOf(state, fromId);
  if (!old || !club || !league) return { ok: false };

  leaveClub(old);
  state.market.offers = [];
  state.userClubId = clubId;
  delete state.pendingJob;
  state.boardWarnings = 0;
  state.career = [...(state.career ?? []), { season: state.season, round: league.currentRound, fromId, toId: clubId, reason: job.reason }];
  club.lineup = autoLineup(club, AI_FORMATION, "balanced", 0, nextCompetition(state));
  // AC 13: never a place the club has already lost; no cup goal for a cup already under way.
  state.boardGoal = Math.max(userBoardGoal(state), positionOf(leagueOf(state, clubId)!, clubId));
  state.cupGoal = -1;
  return { ok: true, state };
}
