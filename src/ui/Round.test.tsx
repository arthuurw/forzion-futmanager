// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { playRound } from "../engine/season";
import { useGame } from "../store";
import { App } from "../App";
import { Round } from "./Round";
import { resetAll, seededGame, skipLive } from "./test-utils";

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

  test("mostra Rodada N de 38", async () => {
    const user = userEvent.setup();
    useGame.setState({ phase: "squad", game: seededGame(2, 0, 4), hasSave: true });
    render(<App />);
    expect(screen.getByText("Rodada 5 de 38")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Jogar rodada" }));
    await skipLive(user);
    await screen.findByRole("region", { name: "Sua partida" });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Rodada 5");
    expect(screen.getByText("Rodada 6 de 38")).toBeInTheDocument();
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
