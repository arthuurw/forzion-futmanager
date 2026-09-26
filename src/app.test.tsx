// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { playRound } from "./engine/season";
import { computeTable } from "./engine/table";
import { loadGame, saveGame } from "./persistence/save";
import { useGame, userClub } from "./store";
import { App } from "./App";
import { resetAll, resetStore, seededGame } from "./ui/test-utils";

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
    await screen.findByRole("region", { name: "Sua partida" });

    const viaReload = useGame.getState();
    expect(viaReload.game).toEqual(direct.state);
    expect(viaReload.lastRound!.results).toEqual(direct.results);
    expect(viaReload.lastRound!.userEvents).toEqual(direct.userEvents);
  });
});
