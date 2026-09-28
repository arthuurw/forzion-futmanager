// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../App";
import type { GameState } from "../engine/types";
import { useGame, userClub } from "../store";
import { finalOrder, resetAll, seededGame, seededGameIn } from "./test-utils";

beforeEach(resetAll);

let ended: GameState | null = null;
/** One finished season with a goal the user met, shared by the tests. */
function endedSeason(): GameState {
  ended ??= seededGame(35, 1, 38);
  const copy = JSON.parse(JSON.stringify(ended)) as GameState;
  copy.boardGoal = 20;
  return copy;
}

/** Written out here (L-004): the goal as the screens word it. */
function goalText(state: GameState): string {
  const division = state.leagues.findIndex((l) => l.clubs.some((c) => c.id === state.userClubId));
  if (division === 0 && state.boardGoal === 16) return "Meta: não cair";
  if (division === 1 && state.boardGoal === 4) return "Meta: subir";
  return `Meta: até o ${state.boardGoal}º`;
}

async function turnSeason(game: GameState) {
  const user = userEvent.setup();
  useGame.setState({ phase: "end", game, hasSave: true });
  render(<App />);
  await user.click(screen.getByRole("button", { name: "Próxima temporada" }));
  expect(await screen.findByRole("heading", { name: "Nova temporada" })).toBeInTheDocument();
  return useGame.getState().game!;
}

describe("tela Nova temporada", () => {
  test("mostra aposentados contratos evolução e meta", async () => {
    const game = endedSeason();
    const [veteran, leaving, ...rest] = userClub(game)!.players;
    Object.assign(veteran!, { age: 36, contractSeasons: 2 });
    Object.assign(leaving!, { age: 25, contractSeasons: 1 });
    for (const p of rest) Object.assign(p, { age: Math.min(p.age, 30), contractSeasons: Math.max(p.contractSeasons, 2) });
    const before = new Map(userClub(game)!.players.map((p) => [p.id, p.rating]));
    const after = await turnSeason(game);
    expect(within(screen.getByRole("region", { name: "Aposentados" })).getAllByRole("listitem").map((li) => li.textContent)).toEqual([veteran!.name]);
    expect(within(screen.getByRole("region", { name: "Fim de contrato" })).getAllByRole("listitem").map((li) => li.textContent)).toEqual([leaving!.name]);
    const rows = within(screen.getByRole("table", { name: "Evolução" })).getAllByRole("row").slice(1);
    const squad = userClub(after)!.players;
    expect(rows).toHaveLength(squad.length);
    expect(squad).toHaveLength(20);
    for (const r of rows) {
      const cells = within(r).getAllByRole("cell").map((c) => c.textContent);
      const p = squad.find((x) => x.name === cells[0])!;
      expect([cells[2], cells[3]], p.name).toEqual([String(before.get(p.id)), String(p.rating)]);
    }
    expect(rows.some((r) => r.classList.contains("up") || r.classList.contains("down"))).toBe(true);
    expect(screen.getByText(new RegExp(goalText(after)))).toBeInTheDocument();
  }, 60_000);

  test("listas vazias", async () => {
    const game = endedSeason();
    for (const p of userClub(game)!.players) Object.assign(p, { age: Math.min(p.age, 30), contractSeasons: Math.max(p.contractSeasons, 2) });
    await turnSeason(game);
    expect(within(screen.getByRole("region", { name: "Aposentados" })).getByText("Ninguém se aposentou")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Fim de contrato" })).getByText("Nenhum contrato encerrado")).toBeInTheDocument();
  }, 60_000);
});

describe("meta de copa na nova temporada (copa-nacional)", () => {
  test("meta na copa", async () => {
    const labels: [number, string][] = [
      [1, "Meta na copa: chegar aos 16 avos"],
      [2, "Meta na copa: chegar às oitavas"],
      [3, "Meta na copa: chegar às quartas"],
      [4, "Meta na copa: chegar à semifinal"],
    ];
    const game = endedSeason();
    for (const [cupGoal, text] of labels) {
      resetAll();
      useGame.setState({
        phase: "newSeason",
        game: { ...game, cupGoal },
        rolloverReport: { season: 2, retired: [], expired: [], changes: [], divisionIndex: 1, boardGoal: 4, cupGoal },
      });
      const view = render(<App />);
      expect(screen.getByText(new RegExp(text)), `nova temporada ${cupGoal}`).toBeInTheDocument();
      view.unmount();
      useGame.setState({ phase: "cup" });
      const cup = render(<App />);
      expect(screen.getByText(new RegExp(text)), `copa ${cupGoal}`).toBeInTheDocument();
      cup.unmount();
    }
    // Wired through «Próxima temporada» (L-003): the screen shows the new season's goal.
    resetAll();
    const after = await turnSeason(endedSeason());
    const label = labels.find(([g]) => g === after.cupGoal)![1];
    expect(screen.getByText(new RegExp(label))).toBeInTheDocument();
  }, 60_000);
});

describe("nova temporada com países (paises)", () => {
  test("nova temporada com usuário em Portugal", async () => {
    // C22 (AC 22, AD-010): the league of a user in Portugal and the goal «até o Nº».
    const game = seededGameIn(3, 37, 6, 38);
    game.boardGoal = 20;
    const after = await turnSeason(game);
    const pt = after.leagues[3]!;
    expect(pt.clubs.some((c) => c.id === after.userClubId)).toBe(true);
    // Written out (L-004): rank by the best eleven in the league, ties by id; min(20, rank + 3).
    const best11 = (ratings: number[]) => [...ratings].sort((a, b) => b - a).slice(0, 11).reduce((a, b) => a + b, 0) / 11;
    const ranking = [...pt.clubs].sort((a, b) => best11(b.players.map((p) => p.rating)) - best11(a.players.map((p) => p.rating)) || a.id.localeCompare(b.id));
    const goal = Math.min(20, ranking.findIndex((c) => c.id === after.userClubId) + 1 + 3);
    expect(after.boardGoal).toBe(goal);
    expect(screen.getByText(new RegExp(`Temporada 2 · Liga Portuguesa · Meta: até o ${goal}º`))).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Evolução" }).closest(".fill")).not.toBeNull();
  }, 60_000);
});

describe("campeões na nova temporada (ajustes-audio)", () => {
  test("campeões das 4 ligas na nova temporada", async () => {
    // C11 (AC 10, AD-010): each league's champion, read from its final table before the turn.
    const game = endedSeason();
    const labels: Record<string, string> = { "BR 0": "Série A", "BR 1": "Série B", "AR 0": "Liga Argentina", "PT 0": "Liga Portuguesa" };
    const expected = game.leagues.map((l) => [labels[`${l.country} ${l.tier}`], l.clubs.find((c) => c.id === finalOrder(l)[0])!.name]);
    expect(expected.map(([l]) => l)).toEqual(["Série A", "Série B", "Liga Argentina", "Liga Portuguesa"]);
    await turnSeason(game);
    const table = screen.getByRole("table", { name: "Campeões" });
    const rows = within(table)
      .getAllByRole("row")
      .slice(1)
      .map((r) => within(r).getAllByRole("cell").map((c) => c.textContent));
    expect(rows).toEqual(expected);
    expect(table.closest(".fill")).not.toBeNull();
  }, 60_000);
});

describe("continental na nova temporada (copa-continental)", () => {
  test("classificação para a continental", async () => {
    // C22 (AC 22, L-007): the Série A champion always qualifies; a Série B club that did not win
    // the national cup never does.
    const base = endedSeason();
    const serieA = base.leagues[0]!;
    const champion = serieA.clubs.find((c) => c.id === finalOrder(serieA)[0])!.id;
    const cupWinner = base.cups[0]!.phases[5]!.ties[0]!.winnerId;
    const serieB = base.leagues[1]!.clubs.find((c) => c.id !== cupWinner)!.id;
    const cases: [string, string, boolean][] = [
      ["classificado", champion, true],
      ["não classificado", serieB, false],
    ];
    for (const [label, userClubId, qualified] of cases) {
      const game = { ...(JSON.parse(JSON.stringify(base)) as GameState), userClubId };
      game.boardGoal = 20;
      const after = await turnSeason(game);
      expect(after.cups[1]!.seeding.includes(after.userClubId!), label).toBe(qualified);
      const line = document.querySelector(".screen-head .goal")!.textContent!;
      expect(line.includes("Copa Continental"), `${label}: ${line}`).toBe(qualified);
      cleanup();
      resetAll();
    }
  }, 120_000);
});
