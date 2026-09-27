// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { openDB } from "idb";
import { DB_NAME, DB_VERSION, SLOT, STORE, loadGame, saveGame } from "../persistence/save";
import { useGame } from "../store";
import { Home } from "./Home";
import { resetAll, seededGame } from "./test-utils";

beforeEach(resetAll);

describe("tela Início", () => {
  test("mostra Carregando enquanto lê o save", () => {
    useGame.setState({ phase: "loading" });
    render(<Home />);
    expect(screen.getByText("Carregando…")).toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  test("sem save mostra só Novo jogo", () => {
    useGame.setState({ phase: "home", hasSave: false, game: null });
    render(<Home />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.map((b) => b.textContent)).toEqual(["Novo jogo"]);
    expect(screen.queryByText("Continuar")).not.toBeInTheDocument();
  });

  test("com save mostra Continuar e Novo jogo", () => {
    useGame.setState({ phase: "home", hasSave: true, game: seededGame() });
    render(<Home />);
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["Continuar", "Novo jogo"]);
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
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["Novo jogo"]);
  });

  // Copa-nacional C61 supersedes multiplas-temporadas C50: v5 is now current, so the first unknown version is 6.
  // Gastos-da-ia C30 (Superseded checks): v6 is now current, so the test uses 7.
  // Paises (Superseded checks): v7 is now current, so the test uses 8.
  test("save de versão 6 incompatível", async () => {
    const db = await openDB(DB_NAME, DB_VERSION, { upgrade: (d) => d.createObjectStore(STORE) });
    await db.put(STORE, { schemaVersion: 8 }, SLOT);
    db.close();
    await useGame.getState().init();
    render(<Home />);
    expect(screen.getByText("Jogo salvo incompatível (versão 8)")).toBeInTheDocument();
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["Novo jogo"]);
  });

});
