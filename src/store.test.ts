// @vitest-environment jsdom
import { saveGame } from "./persistence/save";
import type { GameState } from "./engine/types";
import { useGame, userClub, type GameStore } from "./store";
import { resetAll, seededGame } from "./ui/test-utils";

/** Every save waits on `ctl.gate` when one is set, so a test can look at the store mid-save. */
const ctl = vi.hoisted(() => ({ gate: null as Promise<void> | null }));
vi.mock("./persistence/save", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./persistence/save")>();
  return {
    ...actual,
    saveGame: vi.fn(async (state: Parameters<typeof actual.saveGame>[0]) => {
      if (ctl.gate) await ctl.gate;
      return actual.saveGame(state);
    }),
  };
});

beforeEach(() => {
  ctl.gate = null;
  resetAll();
  vi.mocked(saveGame).mockClear();
});

/** A game where every one of the 11 actions is accepted. */
function stage(): GameState {
  const game = seededGame(4);
  const league = game.leagues[0]!;
  const me = userClub(game)!;
  Object.assign(me.finance, { cash: 50_000_000, loan: 1_000_000 });
  game.market.offers = [
    { id: "o1-1", buyerId: league.clubs[1]!.id, playerId: me.players[20]!.id, amount: 800_000 },
    { id: "o1-2", buyerId: league.clubs[2]!.id, playerId: me.players[19]!.id, amount: 600_000 },
  ];
  return game;
}

const seller = (g: GameState) => g.leagues[0]!.clubs[5]!;
const reserveGk = (g: GameState) => seller(g).players.filter((p) => p.position === "GK").sort((a, b) => a.rating - b.rating)[0]!;

const ACTIONS: [string, (s: GameStore, g: GameState) => Promise<boolean>][] = [
  ["comprar", (s, g) => s.buyPlayer(reserveGk(g).id, 40_000_000)],
  ["aceitar proposta", (s) => s.acceptOffer("o1-1")],
  ["recusar proposta", (s) => s.rejectOffer("o1-2")],
  ["marcar à venda", (s, g) => s.toggleForSale(userClub(g)!.players[3]!.id)],
  ["dispensar", (s, g) => s.releasePlayer(userClub(g)!.players[21]!.id)],
  ["contratar livre", (s, g) => s.signFreeAgent(g.market.freeAgents[0]!.id)],
  ["promover júnior", (s, g) => s.promoteJunior(g.market.juniors[0]!.id)],
  ["preço do ingresso", (s) => s.setTicketPrice(55)],
  ["ampliar", (s) => s.expandStadium()],
  ["pegar empréstimo", (s) => s.takeLoan(500_000)],
  ["pagar empréstimo", (s) => s.repayLoan(500_000)],
];

describe("store: ações de mercado e finanças", () => {
  test("ações de mercado gravam antes de mostrar", async () => {
    expect(ACTIONS).toHaveLength(11);
    for (const [name, act] of ACTIONS) {
      const game = stage();
      useGame.setState({ phase: "market", game, hasSave: true, saving: false, marketMessage: null });
      vi.mocked(saveGame).mockClear();
      let release!: () => void;
      ctl.gate = new Promise<void>((r) => (release = r));

      const done = act(useGame.getState(), game);
      // The save is in flight and blocked: the store still shows the old game.
      await vi.waitFor(() => expect(vi.mocked(saveGame), name).toHaveBeenCalledTimes(1));
      expect(useGame.getState().game, name).toBe(game);
      const saved = vi.mocked(saveGame).mock.calls[0]![0];
      expect(saved, name).not.toEqual(game);

      release();
      expect(await done, name).toBe(true);
      expect(useGame.getState().game, name).toBe(saved);
      ctl.gate = null;
    }
  });
});
