// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Club, GameState, Player, TransferRecord } from "../engine/types";
import { useGame, userClub } from "../store";
import { Market } from "./Market";
import { resetAll, seededGame, seededGameIn } from "./test-utils";

beforeEach(resetAll);

/** Written out here, not imported (L-004). */
const brl = (n: number) => `${n < 0 ? "-" : ""}R$ ${String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
const factor = (age: number) => (age <= 21 ? 1.5 : age <= 27 ? 1.2 : age <= 30 ? 1 : age <= 33 ? 0.6 : 0.3);
// Value follows the rating since multiplas-temporadas (C26).
const value = (p: Player) => Math.round((Math.round((2000 * 1.09 ** (p.rating - 40)) / 100) * 100 * 50 * factor(p.age)) / 10_000) * 10_000;
/** Worst goalkeeper: never among the AI's eleven, so the asking price is the value. */
const reserveGk = (c: Club) => c.players.filter((p) => p.position === "GK").sort((a, b) => a.rating - b.rating)[0]!;

function show(game: GameState) {
  useGame.setState({ phase: "market", game, hasSave: true });
  render(<Market />);
}

describe("tela Mercado", () => {
  test("mercado fechado", () => {
    const actions = /Fazer proposta|Aceitar|Recusar|Contratar|Promover/;
    show(seededGame(1, 0, 5));
    expect(screen.getByText("Mercado fechado - reabre antes da rodada 18")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: actions })).not.toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Mercado" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
  });

  test("mercado fechado depois da rodada 22", () => {
    const actions = /Fazer proposta|Aceitar|Recusar|Contratar|Promover/;
    show(seededGame(1, 0, 22));
    expect(screen.getByText("Mercado fechado - reabre na próxima temporada")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: actions })).not.toBeInTheDocument();
  });

  test("lista do mercado", async () => {
    const user = userEvent.setup();
    const game = seededGame(2);
    show(game);
    const table = screen.getByRole("table", { name: "Mercado" });
    expect(within(table).getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Nome", "Pos", "Idade", "Força", "Clube", "Valor", "Salário"]);
    const rows = within(table).getAllByRole("row").slice(1);
    // Supersedes elenco-mercado-financas C18: the 39 other clubs of both divisions (multiplas-temporadas C9).
    expect(rows).toHaveLength(39 * 22 + 40);
    const cells = rows.map((r) => within(r).getAllByRole("cell").map((c) => c.textContent));
    const ratings = cells.map((c) => Number(c[3]));
    expect(ratings).toEqual([...ratings].sort((a, b) => b - a));
    expect(cells.filter((c) => c[4] === "Livre")).toHaveLength(40);
    expect(cells.some((c) => c[4] === userClub(game)!.name)).toBe(false);
    // One row checked in full against the save.
    const agent = game.market.freeAgents[0]!;
    const row = cells.find((c) => c[0] === agent.name)!;
    expect(row).toEqual([agent.name, { GK: "GOL", DF: "ZAG", MF: "MEI", FW: "ATA" }[agent.position], String(agent.age), String(agent.rating), "Livre", brl(value(agent)), brl(agent.salary)]);

    await user.selectOptions(screen.getByLabelText("Posição"), "FW");
    const forwards = within(screen.getByRole("table", { name: "Mercado" })).getAllByRole("row").slice(1);
    expect(forwards).toHaveLength(39 * 5 + 10);
    for (const r of forwards) expect(within(r).getAllByRole("cell")[1]!.textContent).toBe("ATA");
  }, 60_000);

  test("filtro sem jogadores", async () => {
    const user = userEvent.setup();
    const game = seededGame(2);
    for (const c of game.leagues.flatMap((l) => l.clubs)) if (c.id !== game.userClubId) c.players = c.players.filter((p) => p.position !== "FW");
    game.market.freeAgents = game.market.freeAgents.filter((p) => p.position !== "FW");
    show(game);
    await user.selectOptions(screen.getByLabelText("Posição"), "FW");
    expect(screen.getByText("Nenhum jogador")).toBeInTheDocument();
  });

  test("comprar pela tela", async () => {
    const user = userEvent.setup();
    const game = seededGame(3);
    const seller = game.leagues[0]!.clubs[4]!;
    const target = reserveGk(seller);
    const cash = userClub(game)!.finance.cash;
    show(game);
    await user.click(screen.getByRole("button", { name: target.name }));
    const input = screen.getByLabelText("Oferta");
    await user.clear(input);
    await user.type(input, String(value(target)));
    await user.click(screen.getByRole("button", { name: "Fazer proposta" }));
    await vi.waitFor(() => expect(userClub(useGame.getState().game!)!.players.map((p) => p.id)).toContain(target.id));
    const after = useGame.getState().game!;
    expect(userClub(after)!.finance.cash).toBe(cash - value(target));
    expect(after.leagues[0]!.clubs.find((c) => c.id === seller.id)!.finance.cash).toBe(seller.finance.cash + value(target));
  });

  test("oferta abaixo do preço recusada", async () => {
    const user = userEvent.setup();
    const game = seededGame(4);
    const target = reserveGk(game.leagues[0]!.clubs[6]!);
    show(game);
    await user.click(screen.getByRole("button", { name: target.name }));
    const input = screen.getByLabelText("Oferta");
    await user.clear(input);
    await user.type(input, String(value(target) - 10_000));
    await user.click(screen.getByRole("button", { name: "Fazer proposta" }));
    expect(await screen.findByRole("status")).toHaveTextContent(`Recusado: pedem ${brl(value(target))}`);
    expect(useGame.getState().game).toBe(game);
  });

  test("aba propostas", async () => {
    const user = userEvent.setup();
    const game = seededGame(5);
    const me = userClub(game)!;
    const [buyerA, buyerB] = game.leagues[0]!.clubs.filter((c) => c.id !== me.id);
    game.market.offers = [
      { id: "o1-1", buyerId: buyerA!.id, playerId: me.players[20]!.id, amount: 1_230_000 },
      { id: "o1-2", buyerId: buyerB!.id, playerId: me.players[21]!.id, amount: 450_000 },
    ];
    show(game);
    await user.click(screen.getByRole("tab", { name: /Propostas/ }));
    const items = within(screen.getByRole("region", { name: "Propostas" })).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    game.market.offers.forEach((o, i) => {
      const buyer = game.leagues[0]!.clubs.find((c) => c.id === o.buyerId)!;
      const player = me.players.find((p) => p.id === o.playerId)!;
      expect(items[i]).toHaveTextContent(buyer.name);
      expect(items[i]).toHaveTextContent(player.name);
      expect(items[i]).toHaveTextContent(brl(o.amount));
      expect(within(items[i]!).getByRole("button", { name: "Aceitar" })).toBeInTheDocument();
      expect(within(items[i]!).getByRole("button", { name: "Recusar" })).toBeInTheDocument();
    });
  });

  test("aba propostas vazia", async () => {
    const user = userEvent.setup();
    const game = seededGame(5);
    game.market.offers = [];
    show(game);
    await user.click(screen.getByRole("tab", { name: /Propostas/ }));
    expect(screen.getByText("Nenhuma proposta")).toBeInTheDocument();
  });

  test("aceitar proposta com confirmação", async () => {
    const user = userEvent.setup();
    const game = seededGame(6);
    const me = userClub(game)!;
    const sold = me.players.find((p) => p.id === me.lineup!.starters[5])!;
    const other = me.players.find((p) => !me.lineup!.starters.includes(p.id))!;
    const [buyer, rival] = game.leagues[0]!.clubs.filter((c) => c.id !== me.id);
    game.market.offers = [
      { id: "o1-1", buyerId: buyer!.id, playerId: sold.id, amount: 2_000_000 },
      { id: "o1-2", buyerId: rival!.id, playerId: sold.id, amount: 1_900_000 },
      { id: "o1-3", buyerId: rival!.id, playerId: other.id, amount: 700_000 },
    ];
    show(game);
    await user.click(screen.getByRole("tab", { name: /Propostas/ }));
    const first = () => within(screen.getByRole("region", { name: "Propostas" })).getAllByRole("listitem")[0]!;
    await user.click(within(first()).getByRole("button", { name: "Aceitar" }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent(`Vender ${sold.name} por R$ 2.000.000?`);
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(useGame.getState().game).toBe(game);

    await user.click(within(first()).getByRole("button", { name: "Aceitar" }));
    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    await vi.waitFor(() => expect(useGame.getState().game).not.toBe(game));
    const after = useGame.getState().game!;
    const meAfter = userClub(after)!;
    const buyerAfter = after.leagues[0]!.clubs.find((c) => c.id === buyer!.id)!;
    expect(buyerAfter.players.map((p) => p.id)).toContain(sold.id);
    expect(meAfter.players.map((p) => p.id)).not.toContain(sold.id);
    expect(meAfter.finance.cash).toBe(me.finance.cash + 2_000_000);
    expect(buyerAfter.finance.cash).toBe(buyer!.finance.cash - 2_000_000);
    expect(meAfter.lineup!.starters[5]).toBeNull();
    expect(after.market.offers.map((o) => o.id)).toEqual(["o1-3"]);
  });

  test("base vazia", async () => {
    const user = userEvent.setup();
    const game = seededGame(7);
    game.market.juniors = [];
    show(game);
    await user.click(screen.getByRole("tab", { name: "Base" }));
    expect(screen.getByText("Nenhum júnior na base")).toBeInTheDocument();
  });
});

describe("mercado com duas divisões", () => {
  test("mercado com as duas divisões", () => {
    const game = seededGameIn(1, 31, 7);
    const me = userClub(game)!;
    show(game);
    const rows = within(screen.getByRole("table", { name: "Mercado" })).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(39 * 22 + 40);
    const clubCells = rows.map((r) => within(r).getAllByRole("cell")[4]!.textContent);
    const counts = new Map<string, number>();
    for (const c of clubCells) counts.set(c!, (counts.get(c!) ?? 0) + 1);
    for (const league of game.leagues) {
      for (const c of league.clubs) {
        if (c.id === me.id) expect(counts.has(c.name)).toBe(false);
        else expect(counts.get(c.name), c.name).toBe(22);
      }
    }
    expect(counts.get("Livre")).toBe(40);
    const names = new Set(rows.map((r) => within(r).getAllByRole("cell")[0]!.textContent));
    for (const p of me.players) expect(names.has(p.name)).toBe(false);
  }, 60_000);
});

/** Three AI moves in rounds 1, 2 and 3 of a game `currentRound` rounds in, oldest first as the save keeps them. */
function withTransfers(currentRound: number): { game: GameState; a: Club; b: Club } {
  const game = seededGame(3);
  for (const l of game.leagues) l.currentRound = currentRound;
  const [a, b] = [game.leagues[0]!.clubs[4]!, game.leagues[1]!.clubs[7]!];
  const lines: TransferRecord[] = [
    { round: 1, kind: "free", playerId: "fa-1", playerName: "Livre Contratado", fromId: null, toId: a.id, amount: 44_000 },
    { round: 2, kind: "buy", playerId: "p-2", playerName: "Reforço Comprado", fromId: a.id, toId: b.id, amount: 1_990_000 },
    { round: 3, kind: "release", playerId: "p-3", playerName: "Sobra Dispensada", fromId: b.id, toId: null, amount: 60_000 },
  ];
  game.market.transfers = lines;
  return { game, a, b };
}

const transferRows = () => {
  const table = screen.getByRole("table", { name: "Transferências" });
  expect(within(table).getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Rodada", "Jogador", "De", "Para", "Valor"]);
  return within(table)
    .getAllByRole("row")
    .slice(1)
    .map((r) => within(r).getAllByRole("cell").map((c) => c.textContent));
};

describe("tela Mercado: transferências da IA (gastos-da-ia)", () => {
  test("aba transferências", async () => {
    const user = userEvent.setup();
    const { game, a, b } = withTransfers(3);
    const expected = [
      ["3", "Sobra Dispensada", b.name, "Livre", brl(60_000)],
      ["2", "Reforço Comprado", a.name, b.name, brl(1_990_000)],
      ["1", "Livre Contratado", "Livre", a.name, brl(44_000)],
    ];
    show(game);
    await user.click(screen.getByRole("tab", { name: "Transferências" }));
    expect(transferRows()).toEqual(expected);

    // Next round 6, out of the window: no tabs, the notice and the same list beside it.
    cleanup();
    const closed = withTransfers(5).game;
    show(closed);
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.getByText("Mercado fechado - reabre antes da rodada 18")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Transferências" })).toBeInTheDocument();
    expect(transferRows()).toEqual(expected);
  });

  test("transferências vazio", async () => {
    const user = userEvent.setup();
    const game = seededGame(3);
    expect(game.market.transfers).toEqual([]);
    show(game);
    await user.click(screen.getByRole("tab", { name: "Transferências" }));
    expect(screen.getByText("Nenhuma transferência nesta temporada")).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Transferências" })).not.toBeInTheDocument();
  });

  test("transferências rolam no painel", async () => {
    const user = userEvent.setup();
    show(withTransfers(3).game);
    await user.click(screen.getByRole("tab", { name: "Transferências" }));
    const table = screen.getByRole("table", { name: "Transferências" });
    expect(table.parentElement!.classList.contains("fill")).toBe(true);
    expect(table.closest(".fill")).not.toBeNull();
  });
});
