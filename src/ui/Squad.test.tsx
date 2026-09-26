// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { POSITIONS } from "../engine/types";
import { useGame, userClub } from "../store";
import { Squad } from "./Squad";
import { resetAll, seededGame } from "./test-utils";

beforeEach(resetAll);

/** Written out here, not imported (L-004). */
const brl = (n: number) => `${n < 0 ? "-" : ""}R$ ${String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

describe("tela Elenco", () => {
  test("22 jogadores ordenados por posição e força", () => {
    const game = seededGame(4, 2);
    useGame.setState({ phase: "squad", game });
    render(<Squad />);
    const rows = within(screen.getByRole("table", { name: "Elenco" })).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(22);
    const club = userClub(game)!;
    const expected = [...club.players].sort(
      (a, b) => POSITIONS.indexOf(a.position) - POSITIONS.indexOf(b.position) || b.rating - a.rating || a.name.localeCompare(b.name),
    );
    rows.forEach((row, i) => {
      const cells = within(row).getAllByRole("cell").map((c) => c.textContent);
      const p = expected[i]!;
      expect(cells[0]).toBe(p.name);
      expect(cells[2]).toBe(String(p.age));
      expect(cells[3]).toBe(String(p.rating));
    });
    const positionsInOrder = rows.map((r) => within(r).getAllByRole("cell")[1]!.textContent);
    expect(positionsInOrder.join(",")).toBe([...Array(3).fill("GOL"), ...Array(7).fill("ZAG"), ...Array(7).fill("MEI"), ...Array(5).fill("ATA")].join(","));
  });

  test("oferece 4-4-2 4-3-3 3-5-2 4-5-1", () => {
    useGame.setState({ phase: "squad", game: seededGame() });
    render(<Squad />);
    const options = within(screen.getByLabelText("Formação")).getAllByRole("option").map((o) => o.textContent);
    expect(options).toEqual(["4-4-2", "4-3-3", "3-5-2", "4-5-1"]);
  });

  test("escalação incompleta desabilita Jogar rodada", async () => {
    const user = userEvent.setup();
    useGame.setState({ phase: "squad", game: seededGame() });
    render(<Squad />);
    const play = screen.getByRole("button", { name: "Jogar rodada" });
    expect(play).toBeEnabled();
    expect(screen.queryByText(/Faltam/)).not.toBeInTheDocument();

    // Move the starter of the first DF slot into the second DF slot: the first slot empties.
    const slot2 = screen.getByLabelText("Titular 2 (ZAG)") as HTMLSelectElement;
    const slot3 = screen.getByLabelText("Titular 3 (ZAG)") as HTMLSelectElement;
    await user.selectOptions(slot3, slot2.value);
    expect(screen.getByText("Faltam 1 titulares")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Jogar rodada" })).toBeDisabled();

    // Selecting a bench DF (not starting anywhere) for the empty slot makes it valid again.
    const empty = screen.getByLabelText("Titular 2 (ZAG)") as HTMLSelectElement;
    expect(empty.value).toBe("");
    const starting = new Set(userClub(useGame.getState().game!)!.lineup!.starters);
    const spare = [...empty.options].map((o) => o.value).find((v) => v && !starting.has(v))!;
    expect(spare).toBeTruthy();
    await user.selectOptions(empty, spare);
    expect(screen.queryByText(/Faltam/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Jogar rodada" })).toBeEnabled();
  });

  test("suspenso fica fora com selo SUS", () => {
    const game = seededGame(4, 2);
    const club = userClub(game)!;
    const benchDf = club.players.find((p) => p.position === "DF" && !club.lineup!.starters.includes(p.id))!;
    benchDf.suspendedRounds = 1;
    useGame.setState({ phase: "squad", game });
    render(<Squad />);
    const row = within(screen.getByRole("table", { name: "Elenco" })).getByText(benchDf.name).closest("tr")!;
    expect(within(row).getByText("SUS")).toBeInTheDocument();
    const slot = screen.getByLabelText("Titular 2 (ZAG)") as HTMLSelectElement;
    expect([...slot.options].map((o) => o.value)).not.toContain(benchDf.id);
  });

  test("lesionado fica fora com selo LES e rodadas", () => {
    const game = seededGame(4, 2);
    const club = userClub(game)!;
    const benchMf = club.players.find((p) => p.position === "MF" && !club.lineup!.starters.includes(p.id))!;
    benchMf.injuryRounds = 3;
    useGame.setState({ phase: "squad", game });
    render(<Squad />);
    const row = within(screen.getByRole("table", { name: "Elenco" })).getByText(benchMf.name).closest("tr")!;
    expect(within(row).getByText("LES 3")).toBeInTheDocument();
    for (const select of screen.getAllByLabelText(/^Titular /) as HTMLSelectElement[]) {
      expect([...select.options].map((o) => o.value)).not.toContain(benchMf.id);
    }
  });

  test("escalação com indisponível desabilita", () => {
    const game = seededGame(4, 2);
    const club = userClub(game)!;
    const starter = club.players.find((p) => p.id === club.lineup!.starters[1])!;
    starter.injuryRounds = 2;
    useGame.setState({ phase: "squad", game });
    render(<Squad />);
    expect(screen.getByText("Faltam 1 titulares")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Jogar rodada" })).toBeDisabled();
  });

  test("setas de moral em 5 níveis", () => {
    const game = seededGame(4, 2);
    const club = userClub(game)!;
    const levels: [number, string, string][] = [
      [-2, "↓", "mn2"],
      [-1, "↘", "mn1"],
      [0, "→", "mp0"],
      [1, "↗", "mp1"],
      [2, "↑", "mp2"],
    ];
    levels.forEach(([morale], i) => (club.players[i]!.morale = morale));
    useGame.setState({ phase: "squad", game });
    render(<Squad />);
    const table = screen.getByRole("table", { name: "Elenco" });
    levels.forEach(([, arrow, cls], i) => {
      const row = within(table).getByText(club.players[i]!.name).closest("tr")!;
      const el = row.querySelector(".morale")!;
      expect(el.textContent).toBe(arrow);
      expect(el).toHaveClass(cls);
    });
  });

  test("slot aceita outra posição e marca fora de posição", async () => {
    const user = userEvent.setup();
    const game = seededGame(4, 2);
    const club = userClub(game)!;
    const benchDf = club.players.find((p) => p.position === "DF" && !club.lineup!.starters.includes(p.id))!;
    useGame.setState({ phase: "squad", game });
    render(<Squad />);
    expect(screen.queryByText("fora de posição")).not.toBeInTheDocument();
    // Every slot offers an available bench player of each of the 4 positions, its own and the 3 foreign ones.
    for (const pos of POSITIONS) {
      const spare = club.players.find((p) => p.position === pos && !club.lineup!.starters.includes(p.id))!;
      expect(spare).toBeTruthy();
      for (const select of screen.getAllByLabelText(/^Titular /) as HTMLSelectElement[]) {
        expect([...select.options].map((o) => o.value)).toContain(spare.id);
      }
    }
    const fwSlot = screen.getByLabelText("Titular 11 (ATA)") as HTMLSelectElement;
    await user.selectOptions(fwSlot, benchDf.id);
    expect(fwSlot.closest(".token")).toHaveClass("oop");
    expect(screen.getByText("fora de posição")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Jogar rodada" })).toBeEnabled();
  });

  test("coluna salário", () => {
    const game = seededGame(4, 2);
    const club = userClub(game)!;
    useGame.setState({ phase: "squad", game });
    render(<Squad />);
    const table = screen.getByRole("table", { name: "Elenco" });
    const headers = within(table).getAllByRole("columnheader").map((h) => h.textContent);
    const col = headers.indexOf("Salário");
    expect(col).toBeGreaterThan(-1);
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(22);
    for (const row of rows) {
      const cells = within(row).getAllByRole("cell");
      const player = club.players.find((p) => p.name === cells[0]!.textContent)!;
      expect(cells[col]!.textContent, player.name).toBe(brl(player.salary));
    }
  });

  test("marcar à venda", async () => {
    const user = userEvent.setup();
    const game = seededGame(4, 2);
    const player = userClub(game)!.players[7]!;
    useGame.setState({ phase: "squad", game, hasSave: true });
    render(<Squad />);
    await user.click(screen.getByRole("checkbox", { name: `À venda: ${player.name}` }));
    await vi.waitFor(() => expect(userClub(useGame.getState().game!)!.forSale).toEqual([player.id]));
    expect(screen.getByRole("checkbox", { name: `À venda: ${player.name}` })).toBeChecked();
    await user.click(screen.getByRole("checkbox", { name: `À venda: ${player.name}` }));
    await vi.waitFor(() => expect(userClub(useGame.getState().game!)!.forSale).toEqual([]));
  });

  test("marcar à venda só com mercado aberto", () => {
    useGame.setState({ phase: "squad", game: seededGame(4, 2, 5), hasSave: true });
    render(<Squad />);
    expect(screen.queryAllByRole("checkbox", { name: /^À venda/ })).toHaveLength(0);
    expect(screen.queryAllByRole("button", { name: /^Dispensar/ })).toHaveLength(0);
  });

  test("dispensar com confirmação", async () => {
    const user = userEvent.setup();
    const game = seededGame(4, 2);
    const club = userClub(game)!;
    const player = club.players.find((p) => !club.lineup!.starters.includes(p.id))!;
    useGame.setState({ phase: "squad", game, hasSave: true });
    render(<Squad />);
    await user.click(screen.getByRole("button", { name: `Dispensar ${player.name}` }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent(`Dispensar ${player.name} custa ${brl(4 * player.salary)}. Confirmar?`);
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(useGame.getState().game).toBe(game);
    await user.click(screen.getByRole("button", { name: `Dispensar ${player.name}` }));
    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    await vi.waitFor(() => expect(useGame.getState().game).not.toBe(game));
    const after = useGame.getState().game!;
    expect(userClub(after)!.finance.cash).toBe(club.finance.cash - 4 * player.salary);
    expect(userClub(after)!.players.map((p) => p.id)).not.toContain(player.id);
    expect(after.market.freeAgents.map((p) => p.id)).toContain(player.id);
  });

});
