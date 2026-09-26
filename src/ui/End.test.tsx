// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { computeTable } from "../engine/table";
import { App } from "../App";
import { useGame } from "../store";
import { resetAll, seededGame } from "./test-utils";

beforeEach(resetAll);

describe("tela Fim", () => {
  test("fim mostra campeão sem Jogar rodada", async () => {
    const user = userEvent.setup();
    const game = seededGame(6, 1, 37);
    useGame.setState({ phase: "squad", game, hasSave: true });
    render(<App />);
    expect(screen.getByText("Rodada 38 de 38")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Jogar rodada" }));

    expect(await screen.findByText("Fim da temporada")).toBeInTheDocument();
    const final = useGame.getState().game!.leagues[0]!;
    expect(final.currentRound).toBe(38);
    const table = computeTable(final);
    expect(screen.getByText(`Campeão: ${table[0]!.name}`)).toBeInTheDocument();
    const rows = within(screen.getByRole("table", { name: "Classificação" })).getAllByRole("row").slice(1);
    expect(rows.map((r) => within(r).getAllByRole("cell")[1]!.textContent)).toEqual(table.map((r) => r.name));
    // Column J (index 3: #, Clube, P, J, ...) reads 38 for every club after a full season.
    expect(rows.map((r) => within(r).getAllByRole("cell")[3]!.textContent)).toEqual(Array(20).fill("38"));
    expect(screen.queryByRole("button", { name: "Jogar rodada" })).not.toBeInTheDocument();
  });
});
