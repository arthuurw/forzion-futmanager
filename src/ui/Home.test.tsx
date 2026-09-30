// @vitest-environment jsdom
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { openDB } from "idb";
import { encodeSaveFile } from "../engine/saveFile";
import { playRound } from "../engine/season";
import type { GameState } from "../engine/types";
import { DB_NAME, DB_VERSION, SLOT, STORE, loadGame, saveGame } from "../persistence/save";
import { useGame } from "../store";
import { Home } from "./Home";
import { captureDownloads, resetAll, saveFileOf, seededGame } from "./test-utils";

const ISO = "2026-09-28T12:00:00.000Z";

beforeEach(resetAll);

describe("tela Início", () => {
  test("mostra Carregando enquanto lê o save", () => {
    useGame.setState({ phase: "loading" });
    render(<Home />);
    expect(screen.getByText("Carregando…")).toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  // Lancamento C24 (Superseded checks): the menu gains «Exportar jogo», «Importar jogo» and «Sobre».
  test("sem save mostra só Novo jogo", () => {
    useGame.setState({ phase: "home", hasSave: false, game: null });
    render(<Home />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.map((b) => b.textContent)).toEqual(["Importar jogo", "Novo jogo", "Sobre"]);
    expect(screen.queryByText("Continuar")).not.toBeInTheDocument();
  });

  test("com save mostra Continuar e Novo jogo", () => {
    useGame.setState({ phase: "home", hasSave: true, game: seededGame() });
    render(<Home />);
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["Continuar", "Exportar jogo", "Importar jogo", "Novo jogo", "Sobre"]);
  });

  test("novo jogo sobre save pede confirmação", async () => {
    const user = userEvent.setup();
    const saved = seededGame(3);
    await saveGame(saved);
    useGame.setState({ phase: "home", hasSave: true, game: saved });
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "Novo jogo" }));
    expect(screen.getByText("Isso apaga o jogo salvo. Continuar?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByText("Isso apaga o jogo salvo. Continuar?")).not.toBeInTheDocument();
    expect(useGame.getState().phase).toBe("home");
    expect(useGame.getState().game).toBe(saved);
    expect(await loadGame()).toEqual({ kind: "ok", state: saved });

    await user.click(screen.getByRole("button", { name: "Novo jogo" }));
    await user.click(screen.getByRole("button", { name: "Sim, apagar" }));
    expect(useGame.getState().phase).toBe("chooseClub");
    expect(useGame.getState().game).not.toBe(saved);
    expect(useGame.getState().game?.userClubId).toBeNull();
  });

  test("save incompatível", () => {
    useGame.setState({ phase: "home", hasSave: false, game: null, incompatibleVersion: 7 });
    render(<Home />);
    expect(screen.getByText("Jogo salvo incompatível (versão 7)")).toBeInTheDocument();
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["Importar jogo", "Novo jogo", "Sobre"]);
  });

  // Copa-nacional C61 supersedes multiplas-temporadas C50: v5 is now current, so the first unknown version is 6.
  // Gastos-da-ia C30 (Superseded checks): v6 is now current, so the test uses 7.
  // Paises (Superseded checks): v7 is now current, so the test uses 8.
  // Copa-continental (Superseded checks): v8 is now current, so the test uses 9.
  test("save de versão 6 incompatível", async () => {
    const db = await openDB(DB_NAME, DB_VERSION, { upgrade: (d) => d.createObjectStore(STORE) });
    await db.put(STORE, { schemaVersion: 9 }, SLOT);
    db.close();
    await useGame.getState().init();
    render(<Home />);
    expect(screen.getByText("Jogo salvo incompatível (versão 9)")).toBeInTheDocument();
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["Importar jogo", "Novo jogo", "Sobre"]);
  });

});

describe("exportar e importar (lancamento)", () => {
  afterEach(() => vi.restoreAllMocks());

  const input = () => screen.getByLabelText("Arquivo do jogo salvo") as HTMLInputElement;

  test("Exportar jogo aparece só com clube escolhido", () => {
    useGame.setState({ phase: "home", hasSave: true, game: seededGame() });
    const { unmount } = render(<Home />);
    expect(screen.getByRole("button", { name: "Exportar jogo" })).toBeInTheDocument();
    unmount();
    useGame.setState({ phase: "home", hasSave: false, game: null });
    const second = render(<Home />);
    expect(screen.queryByRole("button", { name: "Exportar jogo" })).not.toBeInTheDocument();
    second.unmount();
    useGame.setState({ phase: "home", hasSave: false, game: { ...seededGame(), userClubId: null } });
    render(<Home />);
    expect(screen.queryByRole("button", { name: "Exportar jogo" })).not.toBeInTheDocument();
  });

  test("Exportar jogo baixa o arquivo com o nome da temporada e do clube", async () => {
    const user = userEvent.setup();
    const game = { ...seededGame(1, 0), season: 2026 };
    const club = game.leagues[0]!.clubs[0]!;
    useGame.setState({ phase: "home", hasSave: true, game });
    const files = captureDownloads();
    render(<Home />);
    await user.click(screen.getByRole("button", { name: "Exportar jogo" }));
    expect(files).toHaveLength(1);
    const slug = club.name.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/ /g, "-");
    expect(files[0]!.name).toBe(`forzion-futmanager-t2026-${slug}.json`);
    const parsed = JSON.parse(await files[0]!.text) as { format: string; save: unknown };
    expect(parsed.format).toBe("forzion-futmanager-save");
    expect(parsed.save).toEqual(game);
  });

  test("Importar jogo aparece com e sem save", () => {
    useGame.setState({ phase: "home", hasSave: false, game: null });
    const { unmount } = render(<Home />);
    expect(screen.getByRole("button", { name: "Importar jogo" })).toBeInTheDocument();
    expect(input().type).toBe("file");
    expect(input().accept).toContain(".json");
    unmount();
    useGame.setState({ phase: "home", hasSave: true, game: seededGame() });
    render(<Home />);
    expect(screen.getByRole("button", { name: "Importar jogo" })).toBeInTheDocument();
  });

  test("importar sem save grava e abre o jogo", async () => {
    const user = userEvent.setup();
    const game = seededGame(4, 2, 3);
    useGame.setState({ phase: "home", hasSave: false, game: null });
    const { unmount } = render(<Home />);
    await user.upload(input(), saveFileOf(encodeSaveFile(game, ISO)));
    await waitFor(() => expect(useGame.getState().phase).toBe("squad"));
    expect(useGame.getState().game).toEqual(game);
    expect(await loadGame()).toEqual({ kind: "ok", state: game });
    unmount();

    // A save whose league is over opens the end screen, as «Continuar» would.
    resetAll();
    let over = seededGame(4, 2);
    while (over.leagues[0]!.currentRound < over.leagues[0]!.rounds.length) over = playRound(over).state;
    // Carreira-dinamica (fixture only): the engine played on past a sacking the store would have stopped at.
    delete over.pendingJob;
    useGame.setState({ phase: "home", hasSave: false, game: null });
    render(<Home />);
    await user.upload(input(), saveFileOf(encodeSaveFile(over, ISO)));
    await waitFor(() => expect(useGame.getState().phase).toBe("end"));
  });

  test("importar sobre save pede confirmação", async () => {
    const user = userEvent.setup();
    const saved = seededGame(3);
    await saveGame(saved);
    const incoming = seededGame(5, 1, 2);
    useGame.setState({ phase: "home", hasSave: true, game: saved });
    render(<Home />);
    await user.upload(input(), saveFileOf(encodeSaveFile(incoming, ISO)));
    expect(await screen.findByText("Isso substitui o jogo salvo. Continuar?")).toBeInTheDocument();
    expect(await loadGame()).toEqual({ kind: "ok", state: saved });
    await user.click(screen.getByRole("button", { name: "Sim, substituir" }));
    await waitFor(() => expect(useGame.getState().phase).toBe("squad"));
    expect(await loadGame()).toEqual({ kind: "ok", state: incoming });
  });

  test("importar sobre save incompatível pede confirmação", async () => {
    const user = userEvent.setup();
    useGame.setState({ phase: "home", hasSave: false, game: null, incompatibleVersion: 9 });
    render(<Home />);
    await user.upload(input(), saveFileOf(encodeSaveFile(seededGame(5), ISO)));
    expect(await screen.findByText("Isso substitui o jogo salvo. Continuar?")).toBeInTheDocument();
    expect(await loadGame()).toEqual({ kind: "none" });
  });

  test("cancelar a importação mantém o save", async () => {
    const user = userEvent.setup();
    const saved = seededGame(3);
    await saveGame(saved);
    useGame.setState({ phase: "home", hasSave: true, game: saved });
    render(<Home />);
    await user.upload(input(), saveFileOf(encodeSaveFile(seededGame(5), ISO)));
    await user.click(await screen.findByRole("button", { name: "Cancelar" }));
    expect(screen.queryByText("Isso substitui o jogo salvo. Continuar?")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Importar jogo" })).toBeInTheDocument();
    expect(useGame.getState().phase).toBe("home");
    expect(await loadGame()).toEqual({ kind: "ok", state: saved });
  });

  async function refused(text: string, message: string) {
    const user = userEvent.setup();
    const saved = seededGame(3);
    await saveGame(saved);
    useGame.setState({ phase: "home", hasSave: true, game: saved });
    render(<Home />);
    await user.upload(input(), saveFileOf(text));
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(useGame.getState().phase).toBe("home");
    expect(await loadGame()).toEqual({ kind: "ok", state: saved });
  }

  test("arquivo inválido mostra o aviso e mantém o save", async () => {
    await refused("isto não é json", "Arquivo inválido: não é um jogo salvo");
  });

  test("JSON que não é arquivo de save mostra o aviso e mantém o save", async () => {
    await refused(JSON.stringify({ format: "outro-jogo", save: seededGame(5) }), "Arquivo inválido: não é um jogo salvo");
  });

  test("versão não suportada mostra o aviso", async () => {
    await refused(encodeSaveFile({ ...seededGame(5), schemaVersion: 9 } as unknown as GameState, ISO), "Versão do jogo salvo não suportada (9)");
  });

  test("arquivo corrompido mostra o aviso e mantém o save", async () => {
    await refused(encodeSaveFile({ ...seededGame(5), leagues: [] }, ISO), "Arquivo corrompido: não foi possível ler o jogo");
  });

  test("ordem do menu", () => {
    useGame.setState({ phase: "home", hasSave: true, game: seededGame() });
    const { unmount } = render(<Home />);
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["Continuar", "Exportar jogo", "Importar jogo", "Novo jogo", "Sobre"]);
    unmount();
    useGame.setState({ phase: "home", hasSave: false, game: null });
    render(<Home />);
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["Importar jogo", "Novo jogo", "Sobre"]);
  });
});

describe("save que não abre (correcoes-validacao)", () => {
  afterEach(() => vi.restoreAllMocks());

  test("falha de leitura oferece tentar de novo", async () => {
    // C1 (AC 1, AC 3): a save of seed 7, and `indexedDB.open` throwing on the first call only.
    const user = userEvent.setup();
    await saveGame(seededGame(7));
    vi.spyOn(indexedDB, "open").mockImplementationOnce(() => {
      throw new DOMException("Connection to Indexed Database server lost", "UnknownError");
    });
    await useGame.getState().init();
    render(<Home />);
    expect(screen.getByText("Não foi possível ler o jogo salvo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Continuar" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByRole("button", { name: "Continuar" })).toBeInTheDocument();
    expect(screen.queryByText("Não foi possível ler o jogo salvo")).not.toBeInTheDocument();
    const slot = await loadGame();
    expect(slot.kind === "ok" && slot.state.seed).toBe(7);
  });

  test("continuar com save que não abre", async () => {
    // C6 (AC 6, L-008): the slot holds a game with no league, which cannot open.
    const user = userEvent.setup();
    const errors: unknown[] = [];
    const onError = (e: ErrorEvent) => errors.push(e.error);
    window.addEventListener("error", onError);
    await saveGame({ ...seededGame(7), leagues: [] });
    await useGame.getState().init();
    render(<Home />);
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText("Não foi possível abrir o jogo salvo")).toBeInTheDocument();
    expect(useGame.getState().phase).toBe("home");
    window.removeEventListener("error", onError);
    expect(errors).toEqual([]);
  });
});

describe("semente pelo endereço (correcoes-validacao)", () => {
  afterEach(() => window.history.replaceState(null, "", "/"));

  test("novo jogo usa a semente do endereço", async () => {
    // AC 60: what check:layout --seed=<n> opens; an invalid value draws the seed as before.
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/?seed=3");
    useGame.setState({ phase: "home" });
    const view = render(<Home />);
    await user.click(screen.getByRole("button", { name: "Novo jogo" }));
    expect(useGame.getState().game!.seed).toBe(3);
    view.unmount();

    for (const bad of ["0", "-4", "2.5", "abc"]) {
      resetAll();
      window.history.replaceState(null, "", `/?seed=${bad}`);
      useGame.setState({ phase: "home" });
      const again = render(<Home />);
      await user.click(screen.getByRole("button", { name: "Novo jogo" }));
      const seed = useGame.getState().game!.seed;
      expect(Number.isInteger(seed) && seed >= 1, bad).toBe(true);
      expect(String(seed), bad).not.toBe(bad);
      again.unmount();
    }
  });
});

describe("confirmação com foco (correcoes-validacao)", () => {
  test("foco na confirmação", async () => {
    // C54 (AC 50): «Novo jogo» over a save; the focus lands on «Sim, apagar».
    const user = userEvent.setup();
    useGame.setState({ phase: "home", game: seededGame(2), hasSave: true });
    render(<Home />);
    await user.click(screen.getByRole("button", { name: "Novo jogo" }));
    const dialog = screen.getByRole("alertdialog", { name: "Confirmar novo jogo" });
    expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "Sim, apagar" }));
  });
});
