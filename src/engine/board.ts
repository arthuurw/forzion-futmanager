/** The board: the season's goal, the verdict and the job offers after a sacking (S5). */
import { bestElevenMean } from "./lineup";
import type { Club, GameState, League, Verdict } from "./types";

/** The screen name of each league, by its index in `leagues` (paises: the four leagues). */
export const DIVISION_LABEL = ["Série A", "Série B", "Liga Argentina", "Liga Portuguesa"] as const;
/** AC 30: the goal that means "do not go down" in the Série A, and "go up" in the Série B. */
export const STAY_UP_GOAL = 16;
export const PROMOTION_GOAL = 4;
/** AC 33: this many places below the goal, or relegated with a stay-up goal, and the user is fired. */
const FIRED_MARGIN = 5;
const JOB_OFFERS = 3;

/** Club ids, strongest first: mean of the best eleven, ties by id (AC 30, AC 34). */
export function strengthRanking(clubs: readonly Club[]): string[] {
  return clubs
    .map((c) => ({ id: c.id, mean: bestElevenMean(c) }))
    .sort((a, b) => b.mean - a.mean || a.id.localeCompare(b.id))
    .map((c) => c.id);
}

/**
 * Paises: what a league's final table means for the board. The Série A relegates, the Série B
 * promotes, and a country's only league (Liga Argentina, Liga Portuguesa) does neither.
 */
export interface Division {
  relegates: boolean;
  promotes: boolean;
}

/** Paises: the role of `leagues[index]`, from the tiers of its country (door 1). */
export function divisionAt(leagues: readonly Pick<League, "country" | "tier">[], index: number): Division {
  const league = leagues[index];
  if (!league) return { relegates: false, promotes: false };
  return {
    relegates: leagues.some((l) => l.country === league.country && l.tier === league.tier + 1),
    promotes: league.tier > 0,
  };
}

/** AC 30, paises AC 13: the worst acceptable position for rank `rank` (1-based) in `division`. */
export function boardGoalFor(division: Division, rank: number): number {
  if (division.relegates) return Math.min(STAY_UP_GOAL, rank + 3);
  if (division.promotes && rank <= PROMOTION_GOAL) return PROMOTION_GOAL;
  return Math.min(20, rank + 3);
}

/** The division the club plays in, 0 = Série A; -1 when it plays nowhere. */
export function divisionOf(state: Pick<GameState, "leagues">, clubId: string): number {
  return state.leagues.findIndex((l) => l.clubs.some((c) => c.id === clubId));
}

/** AC 30: the user's goal for the season about to start; 0 without a club. */
export function userBoardGoal(state: Pick<GameState, "leagues" | "userClubId">): number {
  if (!state.userClubId) return 0;
  const division = divisionOf(state, state.userClubId);
  const league = state.leagues[division];
  if (!league) return 0;
  return boardGoalFor(divisionAt(state.leagues, division), strengthRanking(league.clubs).indexOf(state.userClubId) + 1);
}

/** AC 31: «até o 8º», «não cair» or «subir». */
export function goalLabel(division: Division, goal: number): string {
  if (division.relegates && goal === STAY_UP_GOAL) return "não cair";
  if (division.promotes && goal === PROMOTION_GOAL) return "subir";
  return `até o ${goal}º`;
}

/** AC 32, AC 33, paises AC 14: with no relegation, only 5 or more places below the goal fires. */
export function verdictFor(division: Division, goal: number, position: number): Verdict {
  if (position <= goal) return "met";
  const relegatedWhileStayingUp = division.relegates && goal === STAY_UP_GOAL && position > STAY_UP_GOAL;
  if (relegatedWhileStayingUp || position >= goal + FIRED_MARGIN) return "fired";
  return "missed";
}

export const VERDICT_TEXT: Record<Verdict, string> = {
  met: "Meta cumprida",
  missed: "Meta não cumprida",
  fired: "Demitido",
};

/** Copa-nacional AC 35: reach the semifinal (4) for the 4 strongest, the quarters (3) for 5-8, the round of 16 (2) otherwise. */
const CUP_GOAL_BY_RANK = [
  { maxRank: 4, goal: 4 },
  { maxRank: 8, goal: 3 },
] as const;
const CUP_GOAL_DEFAULT = 2;
/** A club that starts in the preliminary round must reach the «16 avos». */
const CUP_GOAL_PRELIMINARY = 1;

/**
 * Copa-nacional AC 35: the user's cup goal for the season about to start, by the national cup's
 * preliminary draw and the strength ranking of every club of Brazil (paises AC 16); -1 without a
 * club, without a cup, or for a club outside Brazil.
 */
export function userCupGoal(state: Pick<GameState, "leagues" | "userClubId" | "cups">): number {
  const clubId = state.userClubId;
  const cup = state.cups[0];
  if (!clubId || !cup) return -1;
  const brazil = state.leagues.filter((l) => l.country === "BR");
  if (!brazil.some((l) => l.clubs.some((c) => c.id === clubId))) return -1;
  if (cup.seeding.slice(-16).includes(clubId)) return CUP_GOAL_PRELIMINARY;
  const rank = strengthRanking(brazil.flatMap((l) => l.clubs)).indexOf(clubId) + 1;
  return CUP_GOAL_BY_RANK.find((row) => rank <= row.maxRank)?.goal ?? CUP_GOAL_DEFAULT;
}

/** Copa-nacional AC 36: the goal is met by playing the goal's phase or a later one (6 = champion). */
export function cupGoalMet(cupGoal: number, reached: number | null): boolean {
  return reached !== null && reached >= cupGoal;
}

/**
 * Copa-nacional AC 37, 38: a met cup goal lifts the league's verdict one step; a missed one turns
 * «Meta cumprida» into «Meta não cumprida». No cup goal (-1) leaves the league's verdict.
 */
export function combinedVerdict(league: Verdict, cupGoal: number, reached: number | null): Verdict {
  if (cupGoal < 0) return league;
  if (cupGoalMet(cupGoal, reached)) return league === "fired" ? "missed" : "met";
  return league === "met" ? "missed" : league;
}

/** Copa-nacional AC 40: «chegar às oitavas». */
export const CUP_GOAL_LABEL: Readonly<Record<number, string>> = {
  1: "chegar aos 16 avos",
  2: "chegar às oitavas",
  3: "chegar às quartas",
  4: "chegar à semifinal",
};

export function cupGoalLabel(goal: number): string {
  return CUP_GOAL_LABEL[goal] ?? "";
}

/**
 * AC 34, paises AC 15: the 3 clubs just below the user's in the strength ranking of every club of
 * every country; with fewer
 * than 3 below, the 3 weakest other clubs.
 */
export function jobOffers(state: Pick<GameState, "leagues" | "userClubId">): string[] {
  const ranking = strengthRanking(state.leagues.flatMap((l) => l.clubs));
  const at = state.userClubId ? ranking.indexOf(state.userClubId) : -1;
  const below = ranking.slice(at + 1, at + 1 + JOB_OFFERS);
  if (below.length === JOB_OFFERS) return below;
  return ranking.filter((id) => id !== state.userClubId).slice(-JOB_OFFERS);
}
