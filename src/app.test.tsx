// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { playRound } from "./engine/season";
import { computeTable } from "./engine/table";
import { loadGame, saveGame } from "./persistence/save";
import { useGame, userClub } from "./store";
import { App } from "./App";
import { nextSeason } from "./engine/rollover";
import { resetAll, resetStore, seededGame, seededGameIn, skipLive } from "./ui/test-utils";

/** Every save waits on `ctl.gate` when one is set, so a test can observe the order of save and render. */
const ctl = vi.hoisted(() => ({ gate: null as Promise<void> | null }));
vi.mock("./persistence/save", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./persistence/save")>();
  return {
    ...actual,
    saveGame: vi.fn(async (state: Parameters<typeof actual.saveGame>[0]) => {
      if (ctl.gate) await ctl.gate;
      return actual.saveGame(state);
    }),
  };
});

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
}

beforeEach(() => {
  ctl.gate = null;
  resetAll();
});

describe("fluxo do app", () => {
  test("seleção do clube grava save antes do elenco", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Novo jogo" }));
    expect(await screen.findByText("Escolher clube")).toBeInTheDocument();

    const gate = deferred();
    ctl.gate = gate.promise;
    const [first] = screen.getAllByRole("button");
    await user.click(first!);
    // Save is in flight and blocked: the squad screen must not be up yet.
    expect(vi.mocked(saveGame)).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("table", { name: "Elenco" })).not.toBeInTheDocument();
    expect(useGame.getState().phase).toBe("chooseClub");

    gate.resolve();
    expect(await screen.findByRole("table", { name: "Elenco" })).toBeInTheDocument();
    const loaded = await loadGame();
    expect(loaded.kind).toBe("ok");
    if (loaded.kind === "ok") expect(loaded.state.userClubId).toBe(useGame.getState().game!.userClubId);
  });

  test("rodada grava save antes de mostrar resultados", async () => {
    const user = userEvent.setup();
    useGame.setState({ phase: "squad", game: seededGame(5), hasSave: true });
    render(<App />);

    const gate = deferred();
    ctl.gate = gate.promise;
    await user.click(screen.getByRole("button", { name: "Jogar rodada" }));
    await skipLive(user);
    expect(vi.mocked(saveGame)).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("region", { name: "Sua partida" })).not.toBeInTheDocument();
    expect(await loadGame()).toEqual({ kind: "none" });

    gate.resolve();
    expect(await screen.findByRole("region", { name: "Sua partida" })).toBeInTheDocument();
    const loaded = await loadGame();
    expect(loaded.kind).toBe("ok");
    if (loaded.kind === "ok") expect(loaded.state.leagues[0]!.currentRound).toBe(1);
  });

  test("Continuar restaura rodada tabela e escalação", async () => {
    const user = userEvent.setup();
    useGame.setState({ phase: "squad", game: seededGame(7, 3, 2), hasSave: true });
    render(<App />);
    await user.selectOptions(screen.getByLabelText("Formação"), "4-3-3");
    await user.click(screen.getByRole("button", { name: "Jogar rodada" }));
    await skipLive(user);
    await screen.findByRole("region", { name: "Sua partida" });
    const before = useGame.getState().game!;
    expect(before.leagues[0]!.currentRound).toBe(3);
    expect(userClub(before)!.lineup!.formation).toBe("4-3-3");

    // Reload: fresh store, same storage.
    cleanup();
    resetStore();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Continuar" }));
    expect(await screen.findByText("Rodada 4 de 38")).toBeInTheDocument();
    const after = useGame.getState().game!;
    expect(after).toEqual(before);
    expect((screen.getByLabelText("Formação") as HTMLSelectElement).value).toBe("4-3-3");
    expect(computeTable(after.leagues[0]!)).toEqual(computeTable(before.leagues[0]!));
    for (let i = 0; i < 11; i++) {
      expect((screen.getByLabelText(new RegExp(`^Titular ${i + 1} `)) as HTMLSelectElement).value).toBe(userClub(before)!.lineup!.starters[i]);
    }
  });

  test("sem IndexedDB joga com aviso", async () => {
    const user = userEvent.setup();
    // @ts-expect-error simulating a browser without IndexedDB
    globalThis.indexedDB = undefined;
    render(<App />);
    expect(await screen.findByText("Salvamento indisponível neste navegador")).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "Novo jogo" }));
    await user.click((await screen.findAllByRole("button"))[0]!);
    await user.click(await screen.findByRole("button", { name: "Jogar rodada" }));
    await skipLive(user);
    expect(await screen.findByRole("region", { name: "Sua partida" })).toBeInTheDocument();
    expect(screen.getByText("Salvamento indisponível neste navegador")).toBeInTheDocument();
    expect(useGame.getState().game!.leagues[0]!.currentRound).toBe(1);
  });

  test("reload antes da rodada não muda resultado", async () => {
    const user = userEvent.setup();
    const afterRound1 = seededGame(9, 4, 1);
    // Path A: no reload - play round 2 straight from memory.
    const direct = playRound(afterRound1);

    // Path B: the same state comes back from storage after a reload, then round 2 is played in the app.
    await saveGame(afterRound1);
    resetStore();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Continuar" }));
    await user.click(await screen.findByRole("button", { name: "Jogar rodada" }));
    await skipLive(user);
    await screen.findByRole("region", { name: "Sua partida" });

    const viaReload = useGame.getState();
    expect(viaReload.game).toEqual(direct.state);
    expect(viaReload.lastRound!.results).toEqual(direct.results);
    expect(viaReload.lastRound!.userEvents).toEqual(direct.userEvents);
  });

  test("reload antes da rodada repete propostas", async () => {
    const user = userEvent.setup();
    const afterRound1 = seededGame(9, 4, 1);
    const league = afterRound1.leagues[0]!;
    const me = league.clubs.find((c) => c.id === afterRound1.userClubId)!;
    // Offers need players for sale; AI signings need an AI club under 18.
    me.forSale = me.players.filter((p) => !me.lineup!.starters.includes(p.id)).map((p) => p.id);
    const ai = league.clubs.find((c) => c.id !== me.id)!;
    ai.players = ai.players.slice(0, 16);
    const direct = playRound(afterRound1);
    expect(direct.state.market.offers.length).toBeGreaterThan(0);
    expect(direct.state.leagues[0]!.clubs.find((c) => c.id === ai.id)!.players).toHaveLength(18);

    await saveGame(afterRound1);
    resetStore();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Continuar" }));
    await user.click(await screen.findByRole("button", { name: "Jogar rodada" }));
    await skipLive(user);
    await screen.findByRole("region", { name: "Sua partida" });

    const viaReload = useGame.getState().game!;
    expect(viaReload.leagues[0]!.rounds).toEqual(direct.state.leagues[0]!.rounds);
    expect(viaReload.market).toEqual(direct.state.market);
    expect(viaReload.leagues[0]!.clubs.find((c) => c.id === ai.id)).toEqual(direct.state.leagues[0]!.clubs.find((c) => c.id === ai.id));
    expect(viaReload).toEqual(direct.state);
  });

  test("fim da rodada ao vivo grava e mostra resultados", async () => {
    const user = userEvent.setup();
    useGame.setState({ phase: "squad", game: seededGame(8), hasSave: true });
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Jogar rodada" }));
    // Let the clock run to 90' on its own, at 4x.
    await user.click(await screen.findByRole("button", { name: "4x" }));
    // The clock stops at half-time (AC 6); resume it.
    // Generous waits: 20 matches per tick, and the suite runs files in parallel.
    await screen.findByText("Intervalo", {}, { timeout: 25000 });
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(await screen.findByRole("region", { name: "Sua partida" }, { timeout: 25000 })).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Outros resultados" })).getAllByRole("listitem")).toHaveLength(9);
    expect(within(screen.getByRole("table", { name: "Classificação" })).getAllByRole("row")).toHaveLength(21);
    const saved = await loadGame();
    expect(saved.kind).toBe("ok");
    if (saved.kind === "ok") {
      expect(saved.state.leagues[0]!.currentRound).toBe(1);
      expect(saved.state.leagues[0]!.rounds[0]!.matches.every((m) => m.result !== null)).toBe(true);
    }
  }, 90_000);

  test("recarregar no meio da rodada volta ao elenco com save intacto", async () => {
    const user = userEvent.setup();
    const before = seededGame(12);
    await saveGame(before);
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Continuar" }));
    await user.click(await screen.findByRole("button", { name: "Jogar rodada" }));
    await screen.findByRole("timer", { name: "Relógio" });
    await new Promise((r) => setTimeout(r, 700));
    expect(useGame.getState().live!.minute).toBeGreaterThanOrEqual(2);

    // Reload mid-round: fresh store, same storage.
    cleanup();
    resetStore();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Continuar" }));
    expect(await screen.findByText("Rodada 1 de 38")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Elenco" })).toBeInTheDocument();
    expect(await loadGame()).toEqual({ kind: "ok", state: before });
  });


describe("duas divisões e várias temporadas", () => {
  test("rodada joga as duas divisões", async () => {
    const user = userEvent.setup();
    useGame.setState({ phase: "squad", game: seededGameIn(1, 23, 2), hasSave: true });
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Jogar rodada" }));
    await skipLive(user);
    expect(await screen.findByRole("heading", { name: "Rodada 1" })).toBeInTheDocument();
    const saved = await loadGame();
    if (saved.kind !== "ok") throw new Error("no save");
    for (const state of [useGame.getState().game!, saved.state]) {
      // Paises (Superseded checks): 4 leagues.
      expect(state.leagues).toHaveLength(4);
      for (const league of state.leagues) {
        expect(league.currentRound, league.id).toBe(1);
        const round1 = league.rounds[0]!.matches;
        expect(round1).toHaveLength(10);
        for (const m of round1) expect(m.result, `${league.id} ${m.id}`).not.toBeNull();
        for (const m of league.rounds[1]!.matches) expect(m.result).toBeNull();
      }
    }
  });

  test("escolher clube fixa a meta", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Novo jogo" }));
    await screen.findByText("Escolher clube");
    const game = useGame.getState().game!;
    const byName = [...game.leagues[0]!.clubs].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    const chosen = byName[7]!;
    await user.click(screen.getAllByRole("button").filter((b) => b.classList.contains("club-card"))[7]!);
    await screen.findByRole("table", { name: "Elenco" });
    // Written out (L-004): rank by the best eleven in the division, ties by id; Série A goal min(16, r + 3).
    const best11 = (ratings: number[]) => [...ratings].sort((a, b) => b - a).slice(0, 11).reduce((a, b) => a + b, 0) / 11;
    const ranking = [...game.leagues[0]!.clubs].sort((a, b) => best11(b.players.map((p) => p.rating)) - best11(a.players.map((p) => p.rating)) || a.id.localeCompare(b.id));
    const goal = Math.min(16, ranking.findIndex((c) => c.id === chosen.id) + 1 + 3);
    const saved = await loadGame();
    if (saved.kind !== "ok") throw new Error("no save");
    expect(saved.state.userClubId).toBe(chosen.id);
    expect(saved.state.boardGoal).toBe(goal);
    expect(useGame.getState().game!.boardGoal).toBe(goal);
  });

  test("recarregar no fim mostra o mesmo resumo", async () => {
    const user = userEvent.setup();
    const game = seededGame(24, 3, 38);
    await saveGame(game);
    resetStore();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Continuar" }));
    expect(await screen.findByText("Fim da temporada 1")).toBeInTheDocument();
    const tableA = computeTable(game.leagues[0]!);
    const tableB = computeTable(game.leagues[1]!);
    const position = tableA.findIndex((r) => r.clubId === game.userClubId) + 1;
    const prize = (21 - position) * 250_000;
    const verdict = position <= game.boardGoal ? "Meta cumprida" : position >= game.boardGoal + 5 || (game.boardGoal === 16 && position > 16) ? "Demitido" : "Meta não cumprida";
    const brl = (n: number) => `R$ ${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
    expect(screen.getByText(`Campeão: ${tableA[0]!.name}`)).toBeInTheDocument();
    expect(screen.getByText(`Campeão: ${tableB[0]!.name}`)).toBeInTheDocument();
    expect(screen.getByText(`Sua posição: ${position}º na Série A`)).toBeInTheDocument();
    expect(screen.getByText(`Prêmio: ${brl(prize)}`)).toBeInTheDocument();
    expect(screen.getByText(verdict)).toBeInTheDocument();
    // The next season from the reloaded save is the same as from the original, field by field.
    const reloaded = useGame.getState().game!;
    expect(reloaded).toEqual(game);
    const jobs = verdict === "Demitido" ? (await import("./engine/season")).seasonReview(game).jobOffers[0] : undefined;
    expect(nextSeason(reloaded, jobs)).toEqual(nextSeason(game, jobs));
  }, 60_000);
});
});

describe("copa no app (copa-nacional)", () => {
  test("data de copa sem o usuário fecha direto", async () => {
    const user = userEvent.setup();
    const game = seededGame(161, 0, 4);
    // A Série A club: the preliminary is the 16 last of the seeding, all from the Série B.
    expect(game.cups[0]!.phases[0]!.ties.some((t) => t.homeId === game.userClubId || t.awayId === game.userClubId)).toBe(false);
    useGame.setState({ phase: "squad", game, hasSave: true });
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Jogar rodada" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Copa Nacional · Preliminar" })).toBeInTheDocument();
    expect(screen.queryByRole("timer", { name: "Relógio" })).not.toBeInTheDocument();
    expect(useGame.getState().live).toBeNull();
    const ties = useGame.getState().game!.cups[0]!.phases[0]!.ties;
    expect(ties).toHaveLength(8);
    for (const t of ties) expect(t.winnerId, t.id).not.toBeNull();
    const loaded = await loadGame();
    if (loaded.kind !== "ok") throw new Error("no save");
    expect(loaded.state.cups[0]!.currentPhase).toBe(1);
    expect(loaded.state.leagues.map((l) => l.currentRound)).toEqual([4, 4, 4, 4]);
  });
});

describe("países no app (paises)", () => {
  test("usuário em Portugal joga e vê a tabela", async () => {
    // C23 (AC 21, L-003): through the app, from a new game.
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Novo jogo" }));
    expect(await screen.findByText("Escolher clube")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Liga Portuguesa" }));
    const card = screen.getAllByRole("button").filter((b) => b.classList.contains("club-card"))[5]!;
    await user.click(card);
    await screen.findByRole("table", { name: "Elenco" });
    const game = useGame.getState().game!;
    const me = userClub(game)!;
    expect(game.leagues[3]!.clubs.some((c) => c.id === me.id)).toBe(true);
    await user.click(screen.getByRole("button", { name: "Jogar rodada" }));
    await skipLive(user);
    await screen.findByRole("heading", { name: "Rodada 1" });
    const select = screen.getByLabelText("Divisão") as HTMLSelectElement;
    expect(select.selectedOptions[0]!.textContent).toBe("Liga Portuguesa");
    const rows = within(screen.getByRole("table", { name: "Classificação" })).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(20);
    const names = rows.map((r) => r.querySelector(".club-name-text")!.textContent);
    expect(new Set(names)).toEqual(new Set(useGame.getState().game!.leagues[3]!.clubs.map((c) => c.name)));
    expect(names).toContain(me.name);
  });
});
