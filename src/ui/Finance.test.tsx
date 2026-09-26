// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { GameState } from "../engine/types";
import { useGame, userClub } from "../store";
import { Finance } from "./Finance";
import { resetAll, seededGame } from "./test-utils";

beforeEach(resetAll);

/** Written out here, not imported (L-004). */
const num = (n: number) => String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const brl = (n: number) => `${n < 0 ? "-" : ""}R$ ${num(n)}`;

/** The value next to a label in the club summary. */
function valueOf(label: string): HTMLElement {
  const dt = within(screen.getByRole("region", { name: "Clube" })).getByText(label).closest("dt")!;
  return dt.nextElementSibling as HTMLElement;
}

function show(game: GameState) {
  useGame.setState({ phase: "finance", game, hasSave: true });
  render(<Finance />);
}

describe("tela Finanças", () => {
  test("resumo do clube", () => {
    const game = seededGame(3);
    const club = userClub(game)!;
    show(game);
    expect(valueOf("Caixa")).toHaveTextContent(brl(club.finance.cash));
    expect(valueOf("Folha por rodada")).toHaveTextContent(brl(club.players.reduce((s, p) => s + p.salary, 0)));
    expect(valueOf("Patrocínio por rodada")).toHaveTextContent(brl(club.finance.sponsorship));
    expect(valueOf("Torcida")).toHaveTextContent(num(club.finance.fans));
    expect(valueOf("Capacidade")).toHaveTextContent(num(club.finance.capacity));
    expect((screen.getByLabelText("Preço do ingresso") as HTMLSelectElement).value).toBe("40");
  });

  test("linhas da última rodada", () => {
    const game = seededGame(4, 0, 1);
    const l = userClub(game)!.finance.lastRound!;
    show(game);
    const rows = within(screen.getByRole("table", { name: "Registro da rodada" })).getAllByRole("row");
    const expected: [string, string][] = [
      ["Público", num(l.attendance)],
      ["Bilheteria", brl(l.tickets)],
      ["Patrocínio", brl(l.sponsorship)],
      ["Salários", brl(-l.salaries)],
      ["Juros", brl(-l.interest)],
      ["Compras", brl(-l.transfersOut)],
      ["Vendas", brl(l.transfersIn)],
      ["Saldo", brl(l.tickets + l.sponsorship + l.transfersIn - l.salaries - l.interest - l.transfersOut)],
    ];
    expect(rows.map((r) => [r.querySelector("th")!.textContent, r.querySelector("td")!.textContent])).toEqual(expected);
    expect(screen.queryByText("Nenhuma rodada jogada")).not.toBeInTheDocument();
  });

  test("nenhuma rodada jogada", () => {
    show(seededGame(5));
    expect(screen.getByText("Nenhuma rodada jogada")).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Registro da rodada" })).not.toBeInTheDocument();
  });

  test("preço do ingresso", () => {
    const game = seededGame(6);
    show(game);
    const options = [...(screen.getByLabelText("Preço do ingresso") as HTMLSelectElement).options];
    expect(options).toHaveLength(39);
    expect(options.map((o) => Number(o.value))).toEqual(Array.from({ length: 39 }, (_, i) => 10 + 5 * i));
    expect(options[0]!.textContent).toBe("R$ 10");
    expect(options[38]!.textContent).toBe("R$ 200");
    expect((screen.getByLabelText("Preço do ingresso") as HTMLSelectElement).value).toBe("40");
    for (const c of game.leagues[0]!.clubs) expect(c.finance.ticketPrice, c.id).toBe(40);
  });

  test("público estimado muda com o preço", async () => {
    const user = userEvent.setup();
    const game = seededGame(7);
    const f = userClub(game)!.finance;
    show(game);
    // Before the first round the form factor is 1,0 (AC 7).
    expect(valueOf("Público estimado")).toHaveTextContent(num(Math.min(f.capacity, f.fans)));
    await user.selectOptions(screen.getByLabelText("Preço do ingresso"), "80");
    const expected = Math.min(f.capacity, Math.floor(f.fans * Math.min(1.3, (40 / 80) ** 1.5)));
    expect(await screen.findByText(num(expected))).toBe(valueOf("Público estimado"));
    expect(userClub(useGame.getState().game!)!.finance.ticketPrice).toBe(80);
  });

  test("ampliar com confirmação", async () => {
    const user = userEvent.setup();
    const game = seededGame(8);
    userClub(game)!.finance.cash = 10_000_000;
    show(game);
    await user.click(screen.getByRole("button", { name: "Ampliar estádio" }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent("Ampliar custa R$ 4.000.000. Confirmar?");
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(userClub(useGame.getState().game!)!.finance.cash).toBe(10_000_000);
    await user.click(screen.getByRole("button", { name: "Ampliar estádio" }));
    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(await screen.findByText("Obras: 6 rodadas")).toBeInTheDocument();
    expect(userClub(useGame.getState().game!)!.finance.cash).toBe(6_000_000);
  });

  test("obra em andamento", async () => {
    const user = userEvent.setup();
    const game = seededGame(9);
    Object.assign(userClub(game)!.finance, { cash: 10_000_000, expansionRoundsLeft: 3 });
    show(game);
    expect(screen.getByText("Obras: 3 rodadas")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ampliar estádio" }));
    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Já há uma obra em andamento");
    expect(userClub(useGame.getState().game!)!.finance.cash).toBe(10_000_000);
  });
});
