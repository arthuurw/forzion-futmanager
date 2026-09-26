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

describe("store: mensagens de recusa", () => {
  test("mensagens de recusa exatas", async () => {
    const reserve = (g: GameState, i: number) => g.leagues[0]!.clubs[i]!.players.filter((p) => p.position === "GK").sort((a, b) => a.rating - b.rating)[0]!;
    const pad = (g: GameState, to: number) => {
      const me = userClub(g)!;
      const extra = g.leagues[0]!.clubs[9]!.players;
      while (me.players.length < to) me.players.push({ ...extra[me.players.length % extra.length]!, id: `pad-${me.players.length}` });
    };
    const cases: [string, (g: GameState) => void, (s: GameStore, g: GameState) => Promise<boolean>, string][] = [
      // C23: every spend above the cash.
      ["compra acima do caixa", (g) => (userClub(g)!.finance.cash = 1000), (s, g) => s.buyPlayer(reserve(g, 5).id, 50_000_000), "Caixa insuficiente"],
      ["luvas acima do caixa", (g) => (userClub(g)!.finance.cash = 1000), (s, g) => s.signFreeAgent(g.market.freeAgents[0]!.id), "Caixa insuficiente"],
      ["rescisão acima do caixa", (g) => (userClub(g)!.finance.cash = 1000), (s, g) => s.releasePlayer(userClub(g)!.players[21]!.id), "Caixa insuficiente"],
      ["ampliação acima do caixa", (g) => (userClub(g)!.finance.cash = 1000), (s) => s.expandStadium(), "Caixa insuficiente"],
      ["pagamento acima do caixa", (g) => Object.assign(userClub(g)!.finance, { cash: 1000, loan: 1_000_000 }), (s) => s.repayLoan(500_000), "Caixa insuficiente"],
      // C50: negative cash.
      ["compra com caixa negativo", (g) => (userClub(g)!.finance.cash = -100_000), (s, g) => s.buyPlayer(reserve(g, 5).id, 50_000_000), "Caixa insuficiente"],
      ["luvas com caixa negativo", (g) => (userClub(g)!.finance.cash = -100_000), (s, g) => s.signFreeAgent(g.market.freeAgents[0]!.id), "Caixa insuficiente"],
      ["rescisão com caixa negativo", (g) => (userClub(g)!.finance.cash = -100_000), (s, g) => s.releasePlayer(userClub(g)!.players[21]!.id), "Caixa insuficiente"],
      ["ampliação com caixa negativo", (g) => (userClub(g)!.finance.cash = -100_000), (s) => s.expandStadium(), "Caixa insuficiente"],
      // C24.
      ["compra com 30", (g) => pad(g, 30), (s, g) => s.buyPlayer(reserve(g, 5).id, 50_000_000), "Elenco cheio (30)"],
      ["livre com 30", (g) => pad(g, 30), (s, g) => s.signFreeAgent(g.market.freeAgents[0]!.id), "Elenco cheio (30)"],
      ["júnior com 30", (g) => pad(g, 30), (s, g) => s.promoteJunior(g.market.juniors[0]!.id), "Elenco cheio (30)"],
      // C25.
      [
        "vendedor com 18",
        (g) => {
          const seller = g.leagues[0]!.clubs[5]!;
          const target = reserve(g, 5);
          seller.players = [target, ...seller.players.filter((p) => p.id !== target.id).slice(0, 17)];
        },
        (s, g) => s.buyPlayer(reserve(g, 5).id, 50_000_000),
        "O clube não vende: elenco no mínimo",
      ],
      // C32.
      [
        "aceitar com 18",
        (g) => {
          const me = userClub(g)!;
          const offered = me.players[19]!;
          me.players = [offered, ...me.players.filter((p) => p.id !== offered.id).slice(0, 17)];
        },
        (s) => s.acceptOffer("o1-2"),
        "Elenco no mínimo (18)",
      ],
      ["dispensar com 18", (g) => (userClub(g)!.players = userClub(g)!.players.slice(0, 18)), (s, g) => s.releasePlayer(userClub(g)!.players[0]!.id), "Elenco no mínimo (18)"],
      // C45.
      ["capacidade acima de 80.000", (g) => (userClub(g)!.finance.capacity = 76_000), (s) => s.expandStadium(), "Capacidade máxima: 80.000"],
      // C47: X is what can still be borrowed.
      ["empréstimo acima do limite", (g) => Object.assign(userClub(g)!.finance, { loanLimit: 3_000_000, loan: 2_000_000 }), (s) => s.takeLoan(1_500_000), "Limite de empréstimo: R$ 1.000.000"],
    ];
    expect(cases).toHaveLength(17);
    for (const [name, prepare, act, text] of cases) {
      const game = stage();
      prepare(game);
      useGame.setState({ phase: "market", game, hasSave: true, saving: false, marketMessage: null });
      expect(await act(useGame.getState(), game), name).toBe(false);
      expect(useGame.getState().marketMessage, name).toBe(text);
      expect(useGame.getState().game, name).toBe(game);
    }
  });
});
