// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, cleanup, render, screen } from "@testing-library/react";
import { resetInstall, watchInstall } from "../pwa/register";
import userEvent from "@testing-library/user-event";
import { useGame } from "../store";
import { About } from "./About";
import { Home } from "./Home";
import { resetAll } from "./test-utils";

beforeEach(resetAll);

describe("tela Sobre (lancamento)", () => {
  test("mostra nome, versão e aviso de ficção", async () => {
    const user = userEvent.setup();
    useGame.setState({ phase: "home", hasSave: false, game: null });
    const { unmount } = render(<Home />);
    await user.click(screen.getByRole("button", { name: "Sobre" }));
    expect(useGame.getState().phase).toBe("about");
    unmount();
    render(<About />);
    expect(screen.getByRole("heading", { name: "Forzion FutManager" })).toBeInTheDocument();
    expect(screen.getByText("Versão 1.0.0")).toBeInTheDocument();
    expect(screen.getByText("Clubes, jogadores e competições são fictícios.")).toBeInTheDocument();
    const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as { version: string };
    expect(pkg.version).toBe("1.0.0");
  });

  test("créditos das músicas e das fontes", () => {
    render(<About />);
    const items = screen.getAllByRole("listitem").map((li) => li.textContent ?? "");
    const music: [string, string][] = [
      ["Old Tricks", "Zane Little Music"],
      ["Hush Hamlet", "Zane Little Music"],
      ["Apple Cider", "Zane Little Music"],
      ["Aura Horizon", "Zane Little Music"],
      ["Summer Memories", "Juhani Junkala"],
    ];
    for (const [title, author] of music) {
      const line = items.find((t) => t.includes(title));
      expect(line, title).toBeDefined();
      expect(line, title).toContain(author);
      expect(line, title).toContain("CC0");
    }
    for (const font of ["Exo 2", "Barlow Semi Condensed"]) {
      const line = items.find((t) => t.startsWith(font));
      expect(line, font).toContain("SIL Open Font License 1.1");
    }
  });

  test("aviso do save local", () => {
    render(<About />);
    expect(screen.getByText("O jogo fica salvo só neste navegador. Use Exportar jogo para levá-lo a outro aparelho.")).toBeInTheDocument();
  });

  test("Voltar leva à tela inicial", async () => {
    const user = userEvent.setup();
    useGame.setState({ phase: "about" });
    render(<About />);
    await user.click(screen.getByRole("button", { name: "Voltar" }));
    expect(useGame.getState().phase).toBe("home");
  });
});

describe("instalar em Sobre (offline-instalar)", () => {
  const MENU = "No celular, use o menu do navegador: Adicionar à tela inicial. No iPhone: Compartilhar › Adicionar à Tela de Início.";
  const INSTALLED = "O jogo está instalado neste aparelho.";
  beforeAll(() => watchInstall(window));
  afterEach(() => {
    resetInstall();
    vi.unstubAllGlobals();
  });
  /** The browser's invitation, as Chrome hands it to the page. */
  const invite = () => {
    const e = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), { prompt: vi.fn(() => Promise.resolve()) });
    act(() => {
      window.dispatchEvent(e);
    });
    return e;
  };

  test("seção instalar", async () => {
    // C10 (AC 10-12, L-005, L-008): the four states.
    // No invitation: the browser's menu, no button.
    const none = render(<About />);
    expect(screen.getByRole("heading", { name: "Instalar" })).toBeInTheDocument();
    expect(screen.getByText(MENU)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Instalar o jogo" })).not.toBeInTheDocument();
    none.unmount();

    // An invitation: the button shows the browser's dialog once and goes.
    const user = userEvent.setup();
    render(<About />);
    const e = invite();
    expect(e.defaultPrevented).toBe(true);
    await user.click(screen.getByRole("button", { name: "Instalar o jogo" }));
    expect(e.prompt).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Instalar o jogo" })).not.toBeInTheDocument();

    // Installed: after `appinstalled`.
    act(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });
    expect(screen.getByText(INSTALLED)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Instalar o jogo" })).not.toBeInTheDocument();
    cleanup();
    resetInstall();

    // Installed: running as the installed app, even with an invitation.
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(display-mode: standalone)", media: query, addEventListener() {}, removeEventListener() {} }));
    render(<About />);
    invite();
    expect(screen.getByText(INSTALLED)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Instalar o jogo" })).not.toBeInTheDocument();
  });
});
