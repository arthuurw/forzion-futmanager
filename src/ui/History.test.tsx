// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../App";
import type { GameState, SeasonRecord } from "../engine/types";
import { useGame, userClub } from "../store";
import { resetAll, seededGame, seededGameIn } from "./test-utils";

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

  test("artilharia da série B", async () => {
    const game = seededGameIn(1, 42, 3, 8);
    await openHistory(game);
    // Written out (L-004): the Série B's scorers only, goals descending, then name.
    const expected = game.leagues[1]!.clubs
      .flatMap((c) => c.players.map((p) => ({ name: p.name, club: c.name, goals: p.seasonGoals })))
      .filter((s) => s.goals > 0)
      .sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name, "pt-BR"))
      .slice(0, 10);
    expect(expected).toHaveLength(10);
    const rows = cellsOf(screen.getByRole("table", { name: "Artilharia" }));
    expect(rows).toEqual(expected.map((s, i) => [String(i + 1), s.name, s.club, String(s.goals)]));
    const serieA = new Set(game.leagues[0]!.clubs.map((c) => c.name));
    for (const r of rows) expect(serieA.has(r[2]!)).toBe(false);
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
      // Seasons without a cup (copa-nacional C54 adds its column, «-» here).
      cups: [],
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
          "-",
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

describe("copa no histórico (copa-nacional)", () => {
  test("campeão da copa no histórico", async () => {
    const game = seededGame(141);
    const [a, b] = game.leagues;
    const record = (season: number, cups: SeasonRecord["cups"]): SeasonRecord => ({
      season,
      userClubId: game.userClubId,
      userLeagueId: "l1",
      userPosition: 3,
      verdict: "met",
      prize: 1,
      cups,
      divisions: [
        { leagueId: "l1", championId: a!.clubs[0]!.id, promotedIds: [], relegatedIds: [], topScorer: null },
        { leagueId: "l2", championId: b!.clubs[0]!.id, promotedIds: [], relegatedIds: [], topScorer: null },
      ],
    });
    // Season 1 was migrated (no cup); season 2 had one, won by a Série B club.
    const champion = b!.clubs[7]!;
    game.history = [record(1, []), record(2, [{ cupId: "cup-nat", championId: champion.id, runnerUpId: a!.clubs[2]!.id, userReached: 2 }])];
    const user = await openHistory(game);
    await user.click(screen.getByRole("tab", { name: "Campeões" }));
    const table = screen.getByRole("table", { name: "Campeões" });
    const headers = within(table).getAllByRole("columnheader").map((h) => h.textContent);
    const col = headers.indexOf("Copa Nacional");
    expect(col).toBeGreaterThan(0);
    const rows = cellsOf(table);
    expect(rows.map((r) => [r[0], r[col]])).toEqual([
      ["2", champion.name],
      ["1", "-"],
    ]);
  });
});

describe("histórico com quatro ligas (paises)", () => {
  test("campeões das quatro ligas", async () => {
    // C22 (AC 22, AD-010): a closed season shows the champion of every league with its name.
    const game = seededGame(142);
    const champions = game.leagues.map((l) => l.clubs[3]!);
    game.history = [
      {
        season: 1,
        userClubId: game.userClubId,
        userLeagueId: "l1",
        userPosition: 5,
        verdict: "met",
        prize: 1,
        cups: [],
        divisions: game.leagues.map((l, k) => ({ leagueId: l.id, championId: champions[k]!.id, promotedIds: [], relegatedIds: [], topScorer: null })),
      },
    ];
    const user = await openHistory(game);
    await user.click(screen.getByRole("tab", { name: "Campeões" }));
    const home = screen.getByRole("table", { name: "Campeões" });
    const abroad = screen.getByRole("table", { name: "Campeões no exterior" });
    const headers = (t: HTMLElement) => within(t).getAllByRole("columnheader").map((h) => h.textContent);
    const row = (t: HTMLElement, header: string) => cellsOf(t)[0]![headers(t).indexOf(header)];
    expect(row(home, "Campeão Série A")).toBe(champions[0]!.name);
    expect(row(home, "Campeão Série B")).toBe(champions[1]!.name);
    expect(headers(abroad)).toEqual(["Temp.", "Campeão Liga Argentina", "Campeão Liga Portuguesa"]);
    expect(cellsOf(abroad)).toEqual([["1", champions[2]!.name, champions[3]!.name]]);
    for (const t of [home, abroad]) expect(t.closest(".fill")).not.toBeNull();
  });
});
