import "fake-indexeddb/auto";
import { screen } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { IDBFactory } from "fake-indexeddb";
import { userBoardGoal } from "../engine/board";
import { newGame } from "../engine/generate";
import { AI_FORMATION, autoLineup } from "../engine/lineup";
import { playDate, playRound, type RoundOutcome } from "../engine/season";
import { atCupDate } from "../engine/test-fixtures";
import type { GameState } from "../engine/types";
import { useGame } from "../store";

/** Fresh IndexedDB and a store back to its initial state - what a page reload gives you. */
export function resetAll(): void {
  globalThis.indexedDB = new IDBFactory();
  useGame.setState(useGame.getInitialState(), true);
}

/** Simulates a reload without touching storage. */
export function resetStore(): void {
  useGame.setState(useGame.getInitialState(), true);
}

/** A game with the user's club chosen and its lineup auto-filled, `roundsPlayed` rounds in. */
export function seededGame(seed = 1, clubIndex = 0, roundsPlayed = 0): GameState {
  return seededGameIn(0, seed, clubIndex, roundsPlayed);
}

/** Same as `seededGame`, with the user's club in division `division` (0 = Série A). The goal is the board's. */
export function seededGameIn(division: number, seed = 1, clubIndex = 0, roundsPlayed = 0): GameState {
  let state = newGame(seed);
  const club = state.leagues[division]!.clubs[clubIndex]!;
  state.userClubId = club.id;
  state.boardGoal = userBoardGoal(state);
  club.lineup = autoLineup(club, AI_FORMATION);
  for (let i = 0; i < roundsPlayed; i++) state = playRound(state).state;
  // Rounds leave players injured or suspended: pick an available eleven again, as a manager would.
  const user = state.leagues[division]!.clubs[clubIndex]!;
  user.lineup = autoLineup(user, user.lineup?.formation ?? AI_FORMATION);
  return state;
}

/** Since partida-ao-vivo, «Jogar rodada» opens the live screen; this jumps to the final whistle. */
export async function skipLive(user: UserEvent): Promise<void> {
  await user.click(await screen.findByRole("button", { name: "Pular para o fim" }));
}

/**
 * Copa-nacional: a game stopped right before cup phase `phase`, played with no user until then;
 * the user then takes the club `pick` chooses, with an eleven available for the cup.
 */
export function cupGame(seed: number, phase: number, pick: (s: GameState) => string): GameState {
  const state = atCupDate(seed, phase);
  state.userClubId = pick(state);
  state.boardGoal = userBoardGoal(state);
  state.cupGoal = 2;
  const club = state.leagues.flatMap((l) => l.clubs).find((c) => c.id === state.userClubId)!;
  club.lineup = autoLineup(club, AI_FORMATION, "balanced", 0, { kind: "cup", cupId: "cup-nat" });
  return state;
}

/**
 * Ajustes-4a: the game right after league round 4 (the next date is the cup's Preliminar), with
 * that round as the last one shown. The user takes the club `pick` chooses, with a clean squad and
 * an auto-filled eleven whose second starter is suspended in the cup only.
 */
export function preliminaryWithCupSuspended(seed: number, pick: (s: GameState) => string) {
  let s = newGame(seed);
  for (let i = 0; i < 3; i++) s = playDate(s).state;
  const { state, ...lastRound }: RoundOutcome = playDate(s);
  state.userClubId = pick(state);
  state.boardGoal = userBoardGoal(state);
  state.cupGoal = 2;
  const club = state.leagues.flatMap((l) => l.clubs).find((c) => c.id === state.userClubId)!;
  for (const p of club.players) Object.assign(p, { injuryRounds: 0, suspendedRounds: 0, cupDiscipline: {} });
  club.lineup = autoLineup(club, AI_FORMATION);
  const suspended = club.players.find((p) => p.id === club.lineup!.starters[1])!;
  suspended.cupDiscipline = { "cup-nat": { yellowCards: 0, suspendedRounds: 1 } };
  return { game: state, lastRound, suspended };
}
