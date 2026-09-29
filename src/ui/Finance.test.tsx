// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { finishCupDate, startCupDate } from "../engine/cup";
import { AI_FORMATION, autoLineup } from "../engine/lineup";
import { playRound } from "../engine/season";
import type { GameState } from "../engine/types";
import { useGame, userClub } from "../store";
import { Finance } from "./Finance";
import { cupGame, resetAll, seededGame, seededGameIn } from "./test-utils";

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
    // Every line non-zero, so a miswired field cannot pass by showing 0: a loan, a purchase and a sale before the round.
    let before = seededGame(4, 0, 1);
    const me = userClub(before)!;
    Object.assign(me.finance, { loan: 1_000_000, pendingOut: 2_340_000, pendingIn: 560_000 });
    let round = playRound(before).state;
    while (userClub(round)!.finance.lastRound!.attendance === 0) {
      // Play on until the user's club has a home game with this setup.
      before = round;
      Object.assign(userClub(before)!.finance, { pendingOut: 2_340_000, pendingIn: 560_000 });
      userClub(before)!.lineup = autoLineup(userClub(before)!, AI_FORMATION);
      round = playRound(before).state;
    }
    const game = round;
    const l = userClub(game)!.finance.lastRound!;
    for (const [k, v] of Object.entries(l)) expect(v, k).not.toBe(0);
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

describe("finanças com divisões e prêmio", () => {
  test("patrocínio da série B", () => {
    const game = seededGameIn(1, 32, 4);
    const f = userClub(game)!.finance;
    expect(f.sponsorship).toBeGreaterThan(0);
    show(game);
    expect(valueOf("Patrocínio por rodada")).toHaveTextContent(brl(Math.round(f.sponsorship * 0.6)));
  });

  test("linha do prêmio", () => {
    const before = seededGame(33, 2, 37);
    show(before);
    expect(within(screen.getByRole("table", { name: "Registro da rodada" })).queryByText("Prêmio")).not.toBeInTheDocument();
    cleanup();
    userClub(before)!.lineup = autoLineup(userClub(before)!, AI_FORMATION);
    const game = playRound(before).state;
    const l = userClub(game)!.finance.lastRound!;
    expect(l.prize).toBeGreaterThan(0);
    show(game);
    const rows = within(screen.getByRole("table", { name: "Registro da rodada" })).getAllByRole("row");
    const cells = rows.map((r) => [r.querySelector("th")!.textContent, r.querySelector("td")!.textContent]);
    expect(cells.find((c) => c[0] === "Prêmio")).toEqual(["Prêmio", brl(l.prize!)]);
    expect(cells.at(-1)).toEqual(["Saldo", brl(l.tickets + l.sponsorship + l.transfersIn - l.salaries - l.interest - l.transfersOut + l.prize!)]);
  }, 60_000);
});

describe("finanças da copa (copa-nacional)", () => {
  test("linha prêmio da copa", () => {
    const before = cupGame(151, 0, (s) => s.cups[0]!.phases[0]!.ties[0]!.homeId);
    const played = finishCupDate(before, startCupDate(before)).state;
    const tie = played.cups[0]!.phases[0]!.ties[0]!;
    const loser = tie.winnerId === tie.homeId ? tie.awayId : tie.homeId;
    const rowsOf = () =>
      within(screen.getByRole("table", { name: "Registro da rodada" }))
        .getAllByRole("row")
        .map((r) => [r.querySelector("th")!.textContent, r.querySelector("td")!.textContent]);

    show({ ...played, userClubId: tie.winnerId });
    const winnerLedger = played.leagues.flatMap((l) => l.clubs).find((c) => c.id === tie.winnerId)!.finance.lastRound!;
    expect(winnerLedger.cupPrize).toBe(150_000);
    const rows = rowsOf();
    expect(rows.find((c) => c[0] === "Prêmio da copa")).toEqual(["Prêmio da copa", "R$ 150.000"]);
    const l = winnerLedger;
    expect(rows.at(-1)).toEqual(["Saldo", brl(l.tickets + l.transfersIn - l.transfersOut + 150_000)]);
    cleanup();

    show({ ...played, userClubId: loser });
    expect(rowsOf().find((c) => c[0] === "Prêmio da copa")).toBeUndefined();
  });
});

describe("textos das finanças (correcoes-validacao)", () => {
  test("concordância das obras", () => {
    // C40 (AC 36, L-008).
    const rows: [number, string][] = [
      [1, "Obras: 1 rodada"],
      [3, "Obras: 3 rodadas"],
    ];
    for (const [rounds, text] of rows) {
      const game = seededGame(9);
      userClub(game)!.finance.expansionRoundsLeft = rounds;
      show(game);
      expect(screen.getByText(text)).toBeInTheDocument();
      cleanup();
    }
  });
});
