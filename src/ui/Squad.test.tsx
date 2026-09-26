// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { POSITIONS } from "../engine/types";
import { useGame, userClub } from "../store";
import { Squad } from "./Squad";
import { resetAll, seededGame } from "./test-utils";

beforeEach(resetAll);

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

    // Selecting another DF for the empty slot makes it valid again.
    const empty = screen.getByLabelText("Titular 2 (ZAG)") as HTMLSelectElement;
    expect(empty.value).toBe("");
    const spare = [...empty.options].map((o) => o.value).find((v) => v && v !== slot3.value)!;
    await user.selectOptions(empty, spare);
    expect(screen.queryByText(/Faltam/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Jogar rodada" })).toBeEnabled();
  });
});
