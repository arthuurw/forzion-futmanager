import { create } from "zustand";
import { newGame as generateNewGame, randomSeed } from "./engine/generate";
import { AI_FORMATION, assignSlot, autoLineup } from "./engine/lineup";
import {
  HALFTIME,
  MATCH_MINUTES,
  changeFormation,
  changePosture,
  runToEnd,
  startRound,
  step,
  substitute,
  type LiveRound,
  type SubRefusal,
} from "./engine/live";
import { findClub, finishRound, isSeasonOver, userLeague, type RoundOutcome } from "./engine/season";
import type { Club, FormationName, GameState, Posture } from "./engine/types";
import { isStorageAvailable, loadGame, saveGame } from "./persistence/save";

export type Phase = "loading" | "home" | "chooseClub" | "squad" | "live" | "round" | "end";
export type SaveStatus = "ok" | "failed" | "unavailable";
export type LastRound = Omit<RoundOutcome, "state">;
export type Clock = "running" | "paused" | "halftime";
export type Speed = 1 | 2 | 4;

/** AC 2 / AC 7: one game minute every 300 ms at 1x, 150 ms at 2x, 75 ms at 4x. */
export const BASE_TICK_MS = 300;

export const REFUSAL_TEXT: Record<SubRefusal, string> = {
  limit: "Limite de 5 substituições",
  sent_off: "Jogador expulso não pode ser substituído",
  returning: "Jogador que saiu não pode voltar",
  not_on_bench: "Escolha um reserva disponível",
  no_match: "Seu time não joga nesta rodada",
};

export interface GameStore {
  phase: Phase;
  game: GameState | null;
  /** A valid save exists in storage. */
  hasSave: boolean;
  /** Set when storage holds a document with an unsupported schemaVersion. */
  incompatibleVersion: unknown;
  saveStatus: SaveStatus;
  lastRound: LastRound | null;
  /** The round being played live. In memory only (door 4). */
  live: LiveRound | null;
  clock: Clock;
  speed: Speed;
  /** Why the last decision was refused, if it was. */
  liveMessage: string | null;
  /** The round reached 90' and is being saved. */
  finishing: boolean;
  init(): Promise<void>;
  newGame(seed?: number): void;
  chooseClub(clubId: string): Promise<void>;
  setFormation(formation: FormationName): void;
  setPosture(posture: Posture): void;
  assignStarter(slotIndex: number, playerId: string): void;
  /** Starts the live round. */
  playRound(): void;
  tick(): void;
  pause(): void;
  resume(): void;
  setSpeed(speed: Speed): void;
  skipToEnd(): Promise<void>;
  substitute(slot: number, inId: string): void;
  changeLiveFormation(formation: FormationName): void;
  changeLivePosture(posture: Posture): void;
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

export const useGame = create<GameStore>()((set, get) => {
  /** Closes the live round at 90': results, condition, save, then the results screen. */
  async function finishLive(): Promise<void> {
    const { game, live, finishing } = get();
    if (!game || !live || finishing) return;
    set({ finishing: true });
    const { state, ...lastRound } = finishRound(game, live);
    set({ game: state, lastRound });
    await persist(state, set);
    set({ phase: isSeasonOver(userLeague(state)) ? "end" : "round", live: null, finishing: false });
  }

  /** Applies a decision to the user's side, only while the clock is stopped. */
  function decide(apply: (live: LiveRound, clubId: string) => LiveRound | { refused: SubRefusal }): void {
    const { live, clock, game, finishing } = get();
    if (!live || !game?.userClubId || clock === "running" || finishing) return;
    const out = apply(live, game.userClubId);
    if ("refused" in out) set({ liveMessage: REFUSAL_TEXT[out.refused] });
    else set({ live: out, liveMessage: null });
  }

  return {
    phase: "loading",
    game: null,
    hasSave: false,
    incompatibleVersion: null,
    saveStatus: "ok",
    lastRound: null,
    live: null,
    clock: "paused",
    speed: 1,
    liveMessage: null,
    finishing: false,

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
      set({ game: generateNewGame(seed), phase: "chooseClub", lastRound: null, live: null });
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

    setPosture(posture) {
      const game = get().game;
      if (!game) return;
      set({ game: editUserClub(game, (club) => (club.lineup ? { ...club, lineup: { ...club.lineup, posture } } : club)) });
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

    playRound() {
      const game = get().game;
      if (!game || isSeasonOver(userLeague(game))) return;
      set({ live: startRound(game), phase: "live", clock: "running", speed: 1, liveMessage: null, finishing: false, lastRound: null });
    },

    tick() {
      const { live, clock, finishing } = get();
      if (!live || clock !== "running" || finishing) return;
      const next = step(live);
      set({ live: next });
      if (next.minute === HALFTIME) set({ clock: "halftime" });
      if (next.minute >= MATCH_MINUTES) void finishLive();
    },

    pause() {
      if (get().clock === "running") set({ clock: "paused" });
    },

    resume() {
      if (get().live && !get().finishing) set({ clock: "running", liveMessage: null });
    },

    setSpeed(speed) {
      set({ speed });
    },

    async skipToEnd() {
      const live = get().live;
      if (!live || get().finishing) return;
      set({ live: runToEnd(live), clock: "paused" });
      await finishLive();
    },

    substitute(slot, inId) {
      decide((live, clubId) => {
        const r = substitute(live, clubId, slot, inId);
        return r.ok ? r.live : { refused: r.reason };
      });
    },

    changeLiveFormation(formation) {
      decide((live, clubId) => changeFormation(live, clubId, formation));
    },

    changeLivePosture(posture) {
      decide((live, clubId) => changePosture(live, clubId, posture));
    },

    continueGame() {
      const game = get().game;
      if (!game) return;
      set({ phase: isSeasonOver(userLeague(game)) ? "end" : "squad", lastRound: null, live: null });
    },

    goToSquad() {
      set({ phase: "squad" });
    },

    goHome() {
      set({ phase: "home" });
    },
  };
});
