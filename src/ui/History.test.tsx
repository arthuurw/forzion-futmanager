// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../App";
import type { GameState, SeasonRecord } from "../engine/types";
import { useGame, userClub } from "../store";
import { resetAll, seededGame } from "./test-utils";

beforeEach(resetAll);

async function openHistory(game: GameState) {
  const user = userEvent.setup();
  useGame.setState({ phase: "squad", game, hasSave: true });
  render(<App />);
  await user.click(screen.getByRole("button", { name: "Histórico" }));
  expect(await screen.findByRole("heading", { name: "Histórico" })).toBeInTheDocument();
  return user;
}

const cellsOf = (table: HTMLElement) =>
  within(table)
    .getAllByRole("row")
    .slice(1)
    .map((r) => within(r).getAllByRole("cell").map((c) => c.textContent));

describe("tela Histórico", () => {
  test("artilharia top 10", async () => {
    const game = seededGame(36, 0, 8);
    const user = await openHistory(game);
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Artilharia", "Estatísticas", "Campeões"]);
    // Written out (L-004): the Série A's scorers, goals descending, then name.
    const expected = game.leagues[0]!.clubs
      .flatMap((c) => c.players.map((p) => ({ name: p.name, club: c.name, goals: p.seasonGoals })))
      .filter((s) => s.goals > 0)
      .sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name, "pt-BR"))
      .slice(0, 10);
    expect(expected).toHaveLength(10);
    expect(cellsOf(screen.getByRole("table", { name: "Artilharia" }))).toEqual(expected.map((s, i) => [String(i + 1), s.name, s.club, String(s.goals)]));
    await user.click(screen.getByRole("button", { name: "Voltar ao elenco" }));
    expect(await screen.findByRole("table", { name: "Elenco" })).toBeInTheDocument();
  });

  test("estatísticas do elenco", async () => {
    const game = seededGame(37);
    const squad = userClub(game)!.players;
    squad.forEach((p, i) => Object.assign(p, { seasonGames: 5 + i, seasonGoals: 1 + (i % 3), careerGames: 40 + i, careerGoals: 9 + i }));
    const user = await openHistory(game);
    await user.click(screen.getByRole("tab", { name: "Estatísticas" }));
    const table = screen.getByRole("table", { name: "Estatísticas" });
    expect(within(table).getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Nome", "Pos", "Jogos", "Gols", "Jogos na carreira", "Gols na carreira"]);
    const rows = cellsOf(table);
    expect(rows).toHaveLength(22);
    for (const p of squad) {
      const row = rows.find((r) => r[0] === p.name)!;
      expect([row[2], row[3], row[4], row[5]], p.name).toEqual([p.seasonGames, p.seasonGoals, p.careerGames + p.seasonGames, p.careerGoals + p.seasonGoals].map(String));
    }
  });

  test("campeões por temporada", async () => {
    const game = seededGame(38);
    const [a, b] = game.leagues;
    const record = (season: number, k: number): SeasonRecord => ({
      season,
      userClubId: game.userClubId,
      userLeagueId: "l1",
      userPosition: 4 + k,
      verdict: "met",
      prize: 1,
      divisions: [
        { leagueId: "l1", championId: a!.clubs[k]!.id, promotedIds: [], relegatedIds: [], topScorer: { name: `Artilheiro A${season}`, clubName: a!.clubs[k]!.name, goals: 20 + k } },
        { leagueId: "l2", championId: b!.clubs[k]!.id, promotedIds: [], relegatedIds: [], topScorer: { name: `Artilheiro B${season}`, clubName: b!.clubs[k]!.name, goals: 15 + k } },
      ],
    });
    game.history = [record(1, 0), record(2, 1)];
    const user = await openHistory(game);
    await user.click(screen.getByRole("tab", { name: "Campeões" }));
    expect(cellsOf(screen.getByRole("table", { name: "Campeões" }))).toEqual(
      [2, 1].map((season) => {
        const k = season - 1;
        return [
          String(season),
          a!.clubs[k]!.name,
          `Artilheiro A${season} (${a!.clubs[k]!.name}) · ${20 + k} gols`,
          b!.clubs[k]!.name,
          `Artilheiro B${season} (${b!.clubs[k]!.name}) · ${15 + k} gols`,
          `${4 + k}º na Série A`,
        ];
      }),
    );
  });

  test("histórico vazio", async () => {
    const user = await openHistory(seededGame(39));
    expect(within(screen.getByRole("region", { name: "Artilharia" })).getByText("Nenhum gol ainda")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Campeões" }));
    expect(within(screen.getByRole("region", { name: "Campeões" })).getByText("Nenhuma temporada encerrada")).toBeInTheDocument();
  });
});
