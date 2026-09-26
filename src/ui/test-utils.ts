import "fake-indexeddb/auto";
import { screen } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { IDBFactory } from "fake-indexeddb";
import { newGame } from "../engine/generate";
import { AI_FORMATION, autoLineup } from "../engine/lineup";
import { playRound } from "../engine/season";
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
  let state = newGame(seed);
  const club = state.leagues[0]!.clubs[clubIndex]!;
  state.userClubId = club.id;
  club.lineup = autoLineup(club, AI_FORMATION);
  for (let i = 0; i < roundsPlayed; i++) state = playRound(state).state;
  // Rounds leave players injured or suspended: pick an available eleven again, as a manager would.
  const user = state.leagues[0]!.clubs[clubIndex]!;
  user.lineup = autoLineup(user, user.lineup?.formation ?? AI_FORMATION);
  return state;
}

/** Since partida-ao-vivo, «Jogar rodada» opens the live screen; this jumps to the final whistle. */
export async function skipLive(user: UserEvent): Promise<void> {
  await user.click(await screen.findByRole("button", { name: "Pular para o fim" }));
}
