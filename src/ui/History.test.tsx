// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../App";
import type { GameState, SeasonRecord } from "../engine/types";
import { useGame, userClub } from "../store";
import { finalOrder, resetAll, seededGame, seededGameIn } from "./test-utils";

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
    // Carreira-dinamica (Superseded checks): the fourth tab, «Carreira». Noticias (Superseded checks): the fifth, «Notícias».
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Artilharia", "Estatísticas", "Campeões", "Carreira", "Notícias"]);
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
          // Copa-continental (Superseded checks): the continental cup's column, «-» here too.
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

describe("liga do usuário no histórico (ajustes-audio)", () => {
  test("liga do usuário de Portugal no histórico", async () => {
    // C12 (AC 11, L-007): a season closed in Portugal, through «Próxima temporada».
    const game = seededGameIn(3, 37, 6, 38);
    game.boardGoal = 20;
    const pt = game.leagues[3]!;
    expect(pt.country).toBe("PT");
    const position = finalOrder(pt).indexOf(game.userClubId!) + 1;
    const user = userEvent.setup();
    useGame.setState({ phase: "end", game, hasSave: true });
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Próxima temporada" }));
    await user.click(await screen.findByRole("button", { name: "Continuar" }));
    await user.click(await screen.findByRole("button", { name: "Histórico" }));
    await user.click(await screen.findByRole("tab", { name: "Campeões" }));
    const table = screen.getByRole("table", { name: "Campeões" });
    const col = within(table).getAllByRole("columnheader").map((h) => h.textContent).indexOf("Sua posição");
    const [row] = cellsOf(table);
    expect(row![0]).toBe("1");
    expect(row![col]).toBe(`${position}º na Liga Portuguesa`);
    expect(row![col]).not.toContain("Série A");
  }, 60_000);
});

describe("continental no histórico (copa-continental)", () => {
  test("coluna da Copa Continental", async () => {
    // C21 (AC 21): one season with the continental cup, one from before it.
    const game = seededGame(145);
    const a = game.leagues[0]!;
    const record = (season: number, withContinental: boolean): SeasonRecord => ({
      season,
      userClubId: game.userClubId,
      userLeagueId: "l1",
      userPosition: 3,
      verdict: "met",
      prize: 1,
      cups: [
        { cupId: "cup-nat", championId: a.clubs[1]!.id, runnerUpId: a.clubs[2]!.id, userReached: 2 },
        ...(withContinental ? [{ cupId: "cup-cont", championId: a.clubs[5]!.id, runnerUpId: a.clubs[6]!.id, userReached: 0 }] : []),
      ],
      divisions: [{ leagueId: "l1", championId: a.clubs[0]!.id, promotedIds: [], relegatedIds: [], topScorer: null }],
    });
    game.history = [record(1, false), record(2, true)];
    const user = await openHistory(game);
    await user.click(screen.getByRole("tab", { name: "Campeões" }));
    const table = screen.getByRole("table", { name: "Campeões" });
    const col = within(table).getAllByRole("columnheader").map((h) => h.textContent).indexOf("Copa Continental");
    expect(col).toBeGreaterThan(0);
    const bySeason = new Map(cellsOf(table).map((r) => [r[0], r[col]]));
    expect(bySeason.get("2")).toBe(a.clubs[5]!.name);
    expect(bySeason.get("1")).toBe("-");
  });
});

describe("carreira no Histórico (carreira-dinamica)", () => {
  test("reputação e carreira", async () => {
    // C2, C18: 3 met and a Série A title = 76; the club changes oldest first; the empty line.
    const game = seededGame(4);
    const [me, x, y, z] = game.leagues[0]!.clubs.map((c) => c.id);
    const name = (id: string) => game.leagues[0]!.clubs.find((c) => c.id === id)!.name;
    const record = (season: number, title: boolean): SeasonRecord => ({
      season,
      userClubId: me!,
      userLeagueId: game.leagues[0]!.id,
      userPosition: title ? 1 : 3,
      verdict: "met",
      prize: 0,
      divisions: game.leagues.map((l) => ({ leagueId: l.id, championId: title && l === game.leagues[0] ? me! : l.clubs[5]!.id, promotedIds: [], relegatedIds: [], topScorer: null })),
      cups: [],
    });
    const empty = structuredClone(game);
    game.history = [record(1, false), record(2, true), record(3, false)];
    game.season = 4;
    game.career = [
      { season: 2, round: 13, fromId: x!, toId: y!, reason: "fired" },
      { season: 3, round: 38, fromId: y!, toId: z!, reason: "offer" },
    ];
    const user = await openHistory(game);
    expect(screen.getByText("Reputação: 76/100")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Carreira" }));
    const lines = within(screen.getByRole("region", { name: "Carreira" })).getAllByRole("listitem").map((li) => li.textContent);
    expect(lines).toEqual([
      `Temporada 2, rodada 13: demitido do ${name(x!)}, assumiu o ${name(y!)}`,
      `Temporada 3, rodada 38: trocou o ${name(y!)} pelo ${name(z!)}`,
    ]);

    for (const career of [[], undefined]) {
      cleanup();
      resetAll();
      const without = structuredClone(empty);
      if (career) without.career = career;
      const again = await openHistory(without);
      await again.click(screen.getByRole("tab", { name: "Carreira" }));
      expect(within(screen.getByRole("region", { name: "Carreira" })).getByText("Nenhuma troca de clube ainda.")).toBeInTheDocument();
    }
  });
});

describe("notícias no Histórico (noticias)", () => {
  test("aba notícias", async () => {
    // C15 (AC 13, L-008): newest first, each with its date; then the empty state.
    const game = seededGame(36, 0, 8);
    const x = game.leagues[0]!.clubs[5]!;
    game.news = [
      { season: 1, date: { kind: "league", round: 3 }, kind: "injury", playerName: "Fulano", rounds: 2 },
      { season: 1, date: { kind: "cup", cupId: "cup-nat", phase: 0 }, kind: "cup", cupId: "cup-nat", phase: 0, result: "advanced", opponentId: x.id },
      { season: 1, date: { kind: "league", round: 8 }, kind: "rating", playerName: "Ciclano", rating: 70, delta: -1 },
    ];
    const user = await openHistory(game);
    await user.click(screen.getByRole("tab", { name: "Notícias" }));
    const items = within(screen.getByRole("region", { name: "Notícias" })).getAllByRole("listitem");
    expect(items.map((li) => [...li.children].map((c) => c.textContent))).toEqual([
      ["Temporada 1 · Rodada 8", "Ciclano caiu para 70."],
      ["Temporada 1 · Copa Nacional · Preliminar", "Copa Nacional: classificado para 16 avos."],
      ["Temporada 1 · Rodada 3", "Fulano se lesionou e fica fora por 2 rodadas."],
    ]);
    cleanup();
    resetAll();
    const empty = await openHistory({ ...seededGame(36, 0, 8), news: [] });
    await empty.click(screen.getByRole("tab", { name: "Notícias" }));
    expect(screen.getByRole("region", { name: "Notícias" })).toHaveTextContent("Nenhuma notícia ainda.");
  });
});
