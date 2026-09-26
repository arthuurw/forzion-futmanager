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
import * as finance from "./engine/finance";
import * as market from "./engine/market";
import { userBoardGoal } from "./engine/board";
import { nextSeason as rollOver, type RolloverReport } from "./engine/rollover";
import { findClub, finishRound, isSeasonOver, userLeague, type RoundOutcome } from "./engine/season";
import type { Club, Finance, FormationName, GameState, Posture } from "./engine/types";
import { isStorageAvailable, loadGame, saveGame } from "./persistence/save";
import { formatMoney } from "./ui/money";

export type Phase =
  | "loading"
  | "home"
  | "chooseClub"
  | "squad"
  | "market"
  | "finance"
  | "live"
  | "round"
  | "end"
  | "newSeason"
  | "history";
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

type Refusal = market.MarketRefusal | finance.FinanceRefusal;
type ActionResult = { ok: true; state: GameState } | { ok: false; reason: Refusal; amount?: number };

/** What the screens say when the engine refuses a market or finance action. */
export function refusalText(reason: Refusal, amount = 0): string {
  switch (reason) {
    case "price":
      return `Recusado: pedem ${formatMoney(amount)}`;
    case "cash":
      return "Caixa insuficiente";
    case "squad_full":
      return `Elenco cheio (${market.SQUAD_MAX})`;
    case "seller_min":
      return "O clube não vende: elenco no mínimo";
    case "user_min":
      return `Elenco no mínimo (${market.SQUAD_MIN})`;
    case "closed":
      return "Mercado fechado";
    case "not_found":
      return "Jogador não encontrado";
    case "works":
      return "Já há uma obra em andamento";
    case "max_capacity":
      return "Capacidade máxima: 80.000";
    case "loan_limit":
      return `Limite de empréstimo: ${formatMoney(amount)}`;
    case "over_debt":
      return "Valor maior que a dívida";
    case "invalid":
      return "Valor inválido";
    case "not_last_year":
      return "Só renova no último ano de contrato";
  }
}

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
  /** Why the last market or finance action was refused, if it was. */
  marketMessage: string | null;
  /** A market or finance action is being saved; further actions wait. */
  saving: boolean;
  /** What the last «Próxima temporada» changed (AC 14). In memory only. */
  rolloverReport: RolloverReport | null;
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
  goToMarket(): void;
  goToFinance(): void;
  /** Market and finance actions (AC 15): each saves before the screen shows the new state. Resolve to accepted or not. */
  buyPlayer(playerId: string, offer: number): Promise<boolean>;
  acceptOffer(offerId: string): Promise<boolean>;
  rejectOffer(offerId: string): Promise<boolean>;
  toggleForSale(playerId: string): Promise<boolean>;
  releasePlayer(playerId: string): Promise<boolean>;
  signFreeAgent(playerId: string): Promise<boolean>;
  promoteJunior(playerId: string): Promise<boolean>;
  setTicketPrice(price: number): Promise<boolean>;
  expandStadium(): Promise<boolean>;
  takeLoan(amount: number): Promise<boolean>;
  repayLoan(amount: number): Promise<boolean>;
  /** AC 26. */
  renewContract(playerId: string): Promise<boolean>;
  /** «Próxima temporada» (AC 10-15, 35): saves the new season, then shows «Nova temporada». */
  nextSeason(jobClubId?: string): Promise<void>;
  goToHistory(): void;
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

/** Applies a finance action to the user's club. */
function withUserFinance(game: GameState, apply: (f: Finance) => finance.FinanceResult): ActionResult {
  const club = userClub(game);
  if (!club) return { ok: false, reason: "not_found" };
  const r = apply(club.finance);
  if (!r.ok) return r;
  return { ok: true, state: editUserClub(game, (c) => ({ ...c, finance: r.finance })) };
}

export const useGame = create<GameStore>()((set, get) => {
  /** AC 15: the save is written first; only then does the game state (and the screen) change. */
  async function commit(action: (game: GameState) => ActionResult): Promise<boolean> {
    const { game, saving } = get();
    if (!game || saving) return false;
    const r = action(game);
    if (!r.ok) {
      set({ marketMessage: refusalText(r.reason, r.amount) });
      return false;
    }
    set({ saving: true });
    await persist(r.state, set);
    set({ game: r.state, marketMessage: null, saving: false });
    return true;
  }

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
    marketMessage: null,
    saving: false,
    rolloverReport: null,

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
      const chosen = editUserClub({ ...game, userClubId: clubId }, (club) => ({ ...club, lineup: autoLineup(club, AI_FORMATION) }));
      // AC 30: the board sets the goal when the manager arrives.
      const next = { ...chosen, boardGoal: userBoardGoal(chosen) };
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

    goToMarket() {
      set({ phase: "market", marketMessage: null });
    },

    goToFinance() {
      set({ phase: "finance", marketMessage: null });
    },

    buyPlayer: (playerId, offer) => commit((g) => market.buyPlayer(g, playerId, offer)),
    acceptOffer: (offerId) => commit((g) => market.acceptOffer(g, offerId)),
    rejectOffer: (offerId) => commit((g) => market.rejectOffer(g, offerId)),
    toggleForSale: (playerId) => commit((g) => market.toggleForSale(g, playerId)),
    releasePlayer: (playerId) => commit((g) => market.releasePlayer(g, playerId)),
    signFreeAgent: (playerId) => commit((g) => market.signFreeAgent(g, playerId)),
    promoteJunior: (playerId) => commit((g) => market.promoteJunior(g, playerId)),
    setTicketPrice: (price) => commit((g) => withUserFinance(g, (f) => finance.setTicketPrice(f, price))),
    expandStadium: () => commit((g) => withUserFinance(g, (f) => finance.expandStadium(f))),
    takeLoan: (amount) => commit((g) => withUserFinance(g, (f) => finance.takeLoan(f, amount))),
    repayLoan: (amount) => commit((g) => withUserFinance(g, (f) => finance.repayLoan(f, amount))),
    renewContract: (playerId) => commit((g) => market.renewContract(g, playerId)),

    async nextSeason(jobClubId) {
      const { game, saving } = get();
      if (!game || saving || !isSeasonOver(userLeague(game))) return;
      set({ saving: true });
      const { state, report } = rollOver(game, jobClubId);
      await persist(state, set);
      set({ game: state, rolloverReport: report, phase: "newSeason", saving: false, lastRound: null, marketMessage: null });
    },

    goToHistory() {
      set({ phase: "history", marketMessage: null });
    },

    continueGame() {
      const game = get().game;
      if (!game) return;
      set({ phase: isSeasonOver(userLeague(game)) ? "end" : "squad", lastRound: null, live: null });
    },

    goToSquad() {
      set({ phase: "squad", marketMessage: null });
    },

    goHome() {
      set({ phase: "home" });
    },
  };
});
