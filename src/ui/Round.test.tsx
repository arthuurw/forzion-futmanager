// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { finishCupDate, startCupDate } from "../engine/cup";
import { playRound } from "../engine/season";
import type { GameState } from "../engine/types";
import { useGame } from "../store";
import { App } from "../App";
import { Round } from "./Round";
import { cupGame, preliminaryWithCupSuspended, resetAll, seededGame, seededGameIn, skipLive } from "./test-utils";
import { computeTable } from "../engine/table";

const ctl = vi.hoisted(() => ({ fail: false }));
vi.mock("../persistence/save", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../persistence/save")>();
  return {
    ...actual,
    saveGame: vi.fn(async (state: Parameters<typeof actual.saveGame>[0]) => {
      if (ctl.fail) throw new Error("put failed");
      return actual.saveGame(state);
    }),
  };
});

beforeEach(() => {
  ctl.fail = false;
  resetAll();
});

describe("tela Rodada", () => {
  test("mostra eventos placar e outros 9 resultados", () => {
    const before = seededGame(8, 5);
    const { state, ...lastRound } = playRound(before);
    useGame.setState({ phase: "round", game: state, lastRound });
    render(<Round />);

    const mine = lastRound.results.find((r) => r.homeId === before.userClubId || r.awayId === before.userClubId)!;
    const clubs = state.leagues[0]!.clubs;
    const name = (id: string) => clubs.find((c) => c.id === id)!.name;
    const section = screen.getByRole("region", { name: "Sua partida" });
    expect(within(section).getByRole("heading")).toHaveTextContent(
      `${name(mine.homeId)} ${mine.result.homeGoals} x ${mine.result.awayGoals} ${name(mine.awayId)}`,
    );
    const lines = within(section).getAllByRole("listitem");
    expect(lines).toHaveLength(lastRound.userEvents.length);
    const minutes = lines.map((li) => Number(li.textContent!.split("'")[0]));
    expect(minutes).toEqual(lastRound.userEvents.map((e) => e.minute));
    expect([...minutes]).toEqual([...minutes].sort((a, b) => a - b));
    const goalLines = lines.filter((li) => li.textContent!.includes("GOL do"));
    expect(goalLines).toHaveLength(mine.result.homeGoals + mine.result.awayGoals);

    const others = within(screen.getByRole("region", { name: "Outros resultados" })).getAllByRole("listitem");
    expect(others).toHaveLength(9);
    for (const r of lastRound.results.filter((x) => x !== mine)) {
      expect(others.map((li) => li.textContent)).toContain(`${name(r.homeId)} ${r.result.homeGoals} x ${r.result.awayGoals} ${name(r.awayId)}`);
    }
  });

  test("falha de save mostra aviso e resultados", async () => {
    const user = userEvent.setup();
    ctl.fail = true;
    useGame.setState({ phase: "squad", game: seededGame(2), hasSave: true });
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Jogar rodada" }));
    await skipLive(user);
    expect(await screen.findByText("Não foi possível salvar")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Sua partida" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Outros resultados" })).toBeInTheDocument();
    expect(useGame.getState().game!.leagues[0]!.currentRound).toBe(1);
  });

  // Copa-nacional (Superseded checks, playRound): after round 4 the next date is the cup's
  // Preliminar, so this starts after round 5, where the next two dates are league rounds.
  test("mostra Rodada N de 38", async () => {
    const user = userEvent.setup();
    useGame.setState({ phase: "squad", game: seededGame(2, 0, 5), hasSave: true });
    render(<App />);
    expect(screen.getByText("Rodada 6 de 38")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Jogar rodada" }));
    await skipLive(user);
    await screen.findByRole("region", { name: "Sua partida" });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Rodada 6");
    expect(screen.getByText("Rodada 7 de 38")).toBeInTheDocument();
  });

  test("público e bilheteria do jogo em casa", () => {
    const num = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    const seen = { home: false, away: false };
    for (let clubIndex = 0; clubIndex < 20 && !(seen.home && seen.away); clubIndex++) {
      const before = seededGame(8, clubIndex);
      const { state, ...lastRound } = playRound(before);
      const mine = lastRound.results.find((r) => r.homeId === before.userClubId || r.awayId === before.userClubId)!;
      const home = mine.homeId === before.userClubId;
      if (seen[home ? "home" : "away"]) continue;
      seen[home ? "home" : "away"] = true;
      useGame.setState({ phase: "round", game: state, lastRound });
      const { unmount } = render(<Round />);
      const section = screen.getByRole("region", { name: "Sua partida" });
      const l = state.leagues[0]!.clubs.find((c) => c.id === before.userClubId)!.finance.lastRound!;
      if (home) {
        expect(section).toHaveTextContent(`Público ${num(l.attendance)}`);
        expect(section).toHaveTextContent(`Bilheteria R$ ${num(l.tickets)}`);
      } else {
        expect(within(section).queryByText(/Público/)).not.toBeInTheDocument();
        expect(within(section).queryByText(/Bilheteria/)).not.toBeInTheDocument();
      }
      unmount();
    }
    expect(seen).toEqual({ home: true, away: true });
  });

});

describe("rodada com duas divisões", () => {
  test("classificação com seletor de divisão", async () => {
    const user = userEvent.setup();
    useGame.setState({ phase: "squad", game: seededGameIn(1, 30, 5, 2), hasSave: true });
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Jogar rodada" }));
    await skipLive(user);
    await screen.findByRole("heading", { name: "Rodada 3" });
    const game = useGame.getState().game!;
    const names = () => within(screen.getByRole("table", { name: "Classificação" })).getAllByRole("row").slice(1).map((r) => r.querySelector(".club-name-text")!.textContent);
    const select = screen.getByLabelText("Divisão") as HTMLSelectElement;
    expect(select.selectedOptions[0]!.textContent).toBe("Série B");
    expect(names()).toEqual(computeTable(game.leagues[1]!).map((r) => r.name));
    await user.selectOptions(select, "Série A");
    expect(names()).toEqual(computeTable(game.leagues[0]!).map((r) => r.name));
    // The other results are the user's division too.
    const bNames = new Set(game.leagues[1]!.clubs.map((c) => c.name));
    const items = within(screen.getByRole("region", { name: "Outros resultados" })).getAllByRole("listitem");
    expect(items).toHaveLength(9);
    for (const li of items) expect(bNames.has(li.querySelector(".h")!.textContent!)).toBe(true);
  });
});

describe("resultados da copa (copa-nacional)", () => {
  const nameIn = (s: GameState, id: string) => s.leagues.flatMap((l) => l.clubs).find((c) => c.id === id)!.name;

  test("resultados da data de copa", () => {
    const before = cupGame(131, 0, (s) => s.cups[0]!.phases[0]!.ties[1]!.homeId);
    const { state, ...lastRound } = finishCupDate(before, startCupDate(before));
    useGame.setState({ phase: "round", game: state, lastRound });
    const { unmount } = render(<Round />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Copa Nacional · Preliminar");
    const ties = within(screen.getByRole("region", { name: "Confrontos" })).getAllByRole("listitem");
    expect(ties).toHaveLength(8);
    state.cups[0]!.phases[0]!.ties.forEach((t, i) => {
      expect(ties[i]).toHaveTextContent(nameIn(state, t.homeId));
      expect(ties[i]).toHaveTextContent(nameIn(state, t.awayId));
    });
    const next = within(screen.getByRole("region", { name: "Próxima fase" })).getAllByRole("listitem");
    expect(next).toHaveLength(16);
    state.cups[0]!.phases[1]!.ties.forEach((t, i) => expect(next[i]).toHaveTextContent(`${nameIn(state, t.homeId)} x ${nameIn(state, t.awayId)}`));
    expect(screen.queryByText(/^Campeão:/)).not.toBeInTheDocument();
    unmount();

    // After the final: the champion instead of the next phase.
    const final = cupGame(131, 5, (s) => s.cups[0]!.phases[5]!.ties[0]!.homeId);
    const done = finishCupDate(final, startCupDate(final));
    const { state: ended, ...last } = done;
    useGame.setState({ phase: "round", game: ended, lastRound: last });
    render(<Round />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Copa Nacional · Final");
    expect(screen.getByText(`Campeão: ${nameIn(ended, ended.cups[0]!.phases[5]!.ties[0]!.winnerId!)}`)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Próxima fase" })).not.toBeInTheDocument();
  }, 60_000);

  test("placar com pênaltis nos resultados", () => {
    const before = cupGame(132, 0, (s) => s.cups[0]!.phases[0]!.ties[0]!.homeId);
    const { state, ...lastRound } = finishCupDate(before, startCupDate(before));
    const mine = lastRound.results[0]!;
    mine.result = { homeGoals: 1, awayGoals: 1, goals: [] };
    mine.penalties = { home: 4, away: 3 };
    useGame.setState({ phase: "round", game: state, lastRound });
    render(<Round />);
    expect(within(screen.getByRole("region", { name: "Sua partida" })).getByRole("heading")).toHaveTextContent(
      `${nameIn(state, mine.homeId)} 1 x 1 (pên. 4 x 3) ${nameIn(state, mine.awayId)}`,
    );
    expect(within(screen.getByRole("region", { name: "Confrontos" })).getAllByRole("listitem")[0]!).toHaveTextContent(
      `${nameIn(state, mine.homeId)} 1 x 1 (pên. 4 x 3) ${nameIn(state, mine.awayId)}`,
    );
  });
});

describe("rodada antes de data de copa sem o usuário (ajustes-4a)", () => {
  test("data de copa sem o usuário libera o suspenso de copa", () => {
    const off = preliminaryWithCupSuspended(142, (s) => s.cups[0]!.seeding[0]!);
    expect(off.game.cups[0]!.phases[0]!.ties.some((t) => t.homeId === off.game.userClubId || t.awayId === off.game.userClubId)).toBe(false);
    useGame.setState({ phase: "round", game: off.game, lastRound: off.lastRound });
    const { unmount } = render(<Round />);
    expect(screen.getByText("Copa Nacional · Preliminar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Jogar rodada" })).toBeEnabled();
    unmount();
    const on = preliminaryWithCupSuspended(142, (s) => s.cups[0]!.phases[0]!.ties[0]!.homeId);
    useGame.setState({ phase: "round", game: on.game, lastRound: on.lastRound });
    render(<Round />);
    expect(screen.getByRole("button", { name: "Jogar rodada" })).toBeDisabled();
  });
});

describe("tabela com quatro ligas (paises)", () => {
  test("tabela escolhe entre as quatro ligas", async () => {
    // C21 (AC 21): the 4 leagues to choose from, opening on the user's.
    const user = userEvent.setup();
    useGame.setState({ phase: "squad", game: seededGameIn(2, 32, 4, 1), hasSave: true });
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Jogar rodada" }));
    await skipLive(user);
    await screen.findByRole("heading", { name: "Rodada 2" });
    const game = useGame.getState().game!;
    const names = () => within(screen.getByRole("table", { name: "Classificação" })).getAllByRole("row").slice(1).map((r) => r.querySelector(".club-name-text")!.textContent);
    const select = screen.getByLabelText("Divisão") as HTMLSelectElement;
    expect([...select.options].map((o) => o.textContent)).toEqual(["Série A", "Série B", "Liga Argentina", "Liga Portuguesa"]);
    expect(select.selectedOptions[0]!.textContent).toBe("Liga Argentina");
    expect(names()).toEqual(computeTable(game.leagues[2]!).map((r) => r.name));
    for (const [label, k] of [["Liga Portuguesa", 3], ["Série B", 1], ["Série A", 0], ["Liga Argentina", 2]] as const) {
      await user.selectOptions(select, label);
      expect(names(), label).toEqual(computeTable(game.leagues[k]!).map((r) => r.name));
    }
  });
});
