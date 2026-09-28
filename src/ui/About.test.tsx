// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
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
