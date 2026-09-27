// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { computeTable } from "../engine/table";
import type { Club, GameState } from "../engine/types";
import { App } from "../App";
import { useGame } from "../store";
import { resetAll, seededGame, skipLive } from "./test-utils";

beforeEach(resetAll);

describe("tela Fim", () => {
  test("fim mostra campeão sem Jogar rodada", async () => {
    const user = userEvent.setup();
    const game = seededGame(6, 1, 37);
    useGame.setState({ phase: "squad", game, hasSave: true });
    render(<App />);
    expect(screen.getByText("Rodada 38 de 38")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Jogar rodada" }));
    await skipLive(user);

    // Supersedes the core's title «Fim da temporada»: it now names the season (multiplas-temporadas C12).
    expect(await screen.findByText("Fim da temporada 1")).toBeInTheDocument();
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

/** Written out here, not imported (L-004). */
const brl = (n: number) => `R$ ${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
const best11 = (c: Club) => [...c.players].map((p) => p.rating).sort((a, b) => b - a).slice(0, 11).reduce((a, b) => a + b, 0) / 11;

let ended: GameState | null = null;
/** One finished season, shared: the user's club is chosen afterwards by each test. */
function endedSeason(): GameState {
  ended ??= seededGame(34, 0, 38);
  return JSON.parse(JSON.stringify(ended)) as GameState;
}

describe("fim de temporada com duas divisões", () => {
  test("resumo da temporada", () => {
    const game = endedSeason();
    const tableA = computeTable(game.leagues[0]!);
    const tableB = computeTable(game.leagues[1]!);
    game.userClubId = tableA[6]!.clubId;
    game.boardGoal = 8;
    useGame.setState({ phase: "end", game, hasSave: true });
    render(<App />);
    expect(screen.getByRole("heading", { name: "Fim da temporada 1" })).toBeInTheDocument();
    expect(screen.getByText(`Campeão: ${tableA[0]!.name}`)).toBeInTheDocument();
    expect(screen.getByText(`Campeão: ${tableB[0]!.name}`)).toBeInTheDocument();
    const listed = (region: string) => within(screen.getByRole("region", { name: region })).getAllByRole("listitem").map((li) => li.textContent);
    expect(listed("Sobem")).toEqual(tableB.slice(0, 4).map((r) => r.name));
    expect(listed("Descem")).toEqual(tableA.slice(16).map((r) => r.name));
    expect(screen.getByText("Sua posição: 7º na Série A")).toBeInTheDocument();
    expect(screen.getByText(`Prêmio: ${brl(14 * 250_000)}`)).toBeInTheDocument();
    expect(screen.getByText("Meta cumprida")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Propostas de emprego" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Próxima temporada" })).toBeEnabled();
  });

  test("demitido escolhe proposta", async () => {
    const user = userEvent.setup();
    const game = endedSeason();
    const tableA = computeTable(game.leagues[0]!);
    game.userClubId = tableA[9]!.clubId;
    game.boardGoal = 5;
    useGame.setState({ phase: "end", game, hasSave: true });
    render(<App />);
    expect(screen.getByText("Demitido")).toBeInTheDocument();
    const ranking = game.leagues.flatMap((l) => l.clubs).sort((a, b) => best11(b) - best11(a) || a.id.localeCompare(b.id));
    const at = ranking.findIndex((c) => c.id === game.userClubId);
    const below = ranking.slice(at + 1, at + 4);
    const offers = within(screen.getByRole("region", { name: "Propostas de emprego" })).getAllByRole("button");
    expect(offers).toHaveLength(3);
    offers.forEach((b, i) => expect(b.textContent!.startsWith(below[i]!.name)).toBe(true));
    const next = screen.getByRole("button", { name: "Próxima temporada" });
    expect(next).toBeDisabled();
    await user.click(offers[2]!);
    expect(next).toBeEnabled();
    await user.click(next);
    expect(await screen.findByRole("heading", { name: "Nova temporada" })).toBeInTheDocument();
    expect(useGame.getState().game!.userClubId).toBe(below[2]!.id);
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(await screen.findByRole("heading", { name: below[2]!.name })).toBeInTheDocument();
    expect(screen.queryByText(/Faltam \d+ titulares/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Jogar rodada" })).toBeEnabled();
  }, 60_000);
});

describe("veredito na tela", () => {
  test("textos do veredito", () => {
    const base = endedSeason();
    const tableA = computeTable(base.leagues[0]!);
    // The user finishes 10th of the Série A; the goal decides the verdict (C38, the on-screen text).
    const cases: [number, string][] = [
      [10, "Meta cumprida"],
      [8, "Meta não cumprida"],
      [5, "Demitido"],
    ];
    for (const [goal, text] of cases) {
      resetAll();
      const game = JSON.parse(JSON.stringify(base)) as GameState;
      game.userClubId = tableA[9]!.clubId;
      game.boardGoal = goal;
      useGame.setState({ phase: "end", game, hasSave: true });
      const view = render(<App />);
      expect(screen.getByText("Sua posição: 10º na Série A")).toBeInTheDocument();
      const shown = ["Meta cumprida", "Meta não cumprida", "Demitido"].filter((t) => screen.queryByText(t));
      expect(shown, `meta ${goal}`).toEqual([text]);
      view.unmount();
    }
  });
});

