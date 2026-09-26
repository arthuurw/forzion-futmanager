import { create } from "zustand";
import { newGame as generateNewGame, randomSeed } from "./engine/generate";
import { AI_FORMATION, assignSlot, autoLineup } from "./engine/lineup";
import { findClub, isSeasonOver, playRound as simulateRound, userLeague, type RoundOutcome } from "./engine/season";
import type { Club, FormationName, GameState } from "./engine/types";
import { isStorageAvailable, loadGame, saveGame } from "./persistence/save";

export type Phase = "loading" | "home" | "chooseClub" | "squad" | "round" | "end";
export type SaveStatus = "ok" | "failed" | "unavailable";
export type LastRound = Omit<RoundOutcome, "state">;

export interface GameStore {
  phase: Phase;
  game: GameState | null;
  /** A valid save exists in storage. */
  hasSave: boolean;
  /** Set when storage holds a document with another schemaVersion. */
  incompatibleVersion: unknown;
  saveStatus: SaveStatus;
  lastRound: LastRound | null;
  init(): Promise<void>;
  newGame(seed?: number): void;
  chooseClub(clubId: string): Promise<void>;
  setFormation(formation: FormationName): void;
  assignStarter(slotIndex: number, playerId: string): void;
  playRound(): Promise<void>;
  continueGame(): void;
  goToSquad(): void;
  goHome(): void;
}

type Set = (partial: Partial<GameStore>) => void;

async function persist(game: GameState, set: Set): Promise<void> {
  if (!isStorageAvailable()) {
    set({ saveStatus: "unavailable" });
    return;
  }
  try {
    await saveGame(game);
    set({ saveStatus: "ok", hasSave: true, incompatibleVersion: null });
  } catch {
    set({ saveStatus: "failed" });
  }
}

/** Returns a new state with the user's club replaced by `edit(club)`. */
function editUserClub(game: GameState, edit: (club: Club) => Club): GameState {
  if (!game.userClubId) return game;
  const league = userLeague(game);
  const clubs = league.clubs.map((c) => (c.id === game.userClubId ? edit(c) : c));
  return { ...game, leagues: game.leagues.map((l) => (l === league ? { ...league, clubs } : l)) };
}

export function userClub(game: GameState): Club | null {
  return game.userClubId ? findClub(userLeague(game), game.userClubId) : null;
}

export const useGame = create<GameStore>()((set, get) => ({
  phase: "loading",
  game: null,
  hasSave: false,
  incompatibleVersion: null,
  saveStatus: "ok",
  lastRound: null,

  async init() {
    // Only the first mount reads storage; StrictMode's second effect run is a no-op.
    if (get().phase !== "loading") return;
    if (!isStorageAvailable()) {
      set({ phase: "home", saveStatus: "unavailable", hasSave: false, game: null });
      return;
    }
    try {
      const r = await loadGame();
      if (r.kind === "ok") set({ phase: "home", game: r.state, hasSave: true, incompatibleVersion: null });
      else if (r.kind === "incompatible") set({ phase: "home", game: null, hasSave: false, incompatibleVersion: r.version });
      else set({ phase: "home", game: null, hasSave: false, incompatibleVersion: null });
    } catch {
      set({ phase: "home", game: null, hasSave: false, saveStatus: "failed" });
    }
  },

  newGame(seed = randomSeed()) {
    set({ game: generateNewGame(seed), phase: "chooseClub", lastRound: null });
  },

  async chooseClub(clubId) {
    const game = get().game;
    if (!game) return;
    const next = editUserClub({ ...game, userClubId: clubId }, (club) => ({ ...club, lineup: autoLineup(club, AI_FORMATION) }));
    set({ game: next });
    await persist(next, set);
    set({ phase: "squad" });
  },

  setFormation(formation) {
    const game = get().game;
    if (!game) return;
    set({ game: editUserClub(game, (club) => ({ ...club, lineup: autoLineup(club, formation) })) });
  },

  assignStarter(slotIndex, playerId) {
    const game = get().game;
    if (!game) return;
    set({
      game: editUserClub(game, (club) => {
        const lineup = club.lineup ? assignSlot(club, club.lineup, slotIndex, playerId) : null;
        return lineup ? { ...club, lineup } : club;
      }),
    });
  },

  async playRound() {
    const game = get().game;
    if (!game) return;
    const { state, ...lastRound } = simulateRound(game);
    set({ game: state, lastRound });
    await persist(state, set);
    set({ phase: isSeasonOver(userLeague(state)) ? "end" : "round" });
  },

  continueGame() {
    const game = get().game;
    if (!game) return;
    set({ phase: isSeasonOver(userLeague(game)) ? "end" : "squad", lastRound: null });
  },

  goToSquad() {
    set({ phase: "squad" });
  },

  goHome() {
    set({ phase: "home" });
  },
}));
