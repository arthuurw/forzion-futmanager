// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useGame } from "../store";
import { ErrorBoundary } from "./ErrorBoundary";
import { captureDownloads, resetAll, seededGame } from "./test-utils";

const boom = new Error("tela quebrou");
function Broken(): never {
  throw boom;
}

function renderBroken() {
  return render(
    <ErrorBoundary>
      <Broken />
    </ErrorBoundary>,
  );
}

beforeEach(() => {
  resetAll();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => vi.restoreAllMocks());

describe("tela de erro (lancamento)", () => {
  test("tela de erro com Recarregar e Exportar jogo", () => {
    useGame.setState({ game: seededGame() });
    const { unmount } = renderBroken();
    expect(screen.getByText("Algo deu errado")).toBeInTheDocument();
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["Exportar jogo", "Recarregar"]);
    unmount();
    useGame.setState({ game: null });
    renderBroken();
    expect(screen.getByText("Algo deu errado")).toBeInTheDocument();
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["Recarregar"]);
  });

  test("Recarregar recarrega a página", async () => {
    const user = userEvent.setup();
    const reload = vi.fn();
    const original = window.location;
    Object.defineProperty(window, "location", { value: { ...original, reload }, configurable: true });
    try {
      renderBroken();
      await user.click(screen.getByRole("button", { name: "Recarregar" }));
      expect(reload).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(window, "location", { value: original, configurable: true });
    }
  });

  test("Exportar jogo na tela de erro baixa o save", async () => {
    const user = userEvent.setup();
    const game = { ...seededGame(2, 3), season: 4 };
    const club = game.leagues[0]!.clubs[3]!;
    useGame.setState({ game });
    const files = captureDownloads();
    renderBroken();
    await user.click(screen.getByRole("button", { name: "Exportar jogo" }));
    expect(files).toHaveLength(1);
    const slug = club.name.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/ /g, "-");
    expect(files[0]!.name).toBe(`forzion-futmanager-t4-${slug}.json`);
    const parsed = JSON.parse(await files[0]!.text) as Record<string, unknown>;
    expect(Object.keys(parsed).sort()).toEqual(["exportedAt", "format", "save"]);
    expect(parsed.format).toBe("forzion-futmanager-save");
    expect(parsed.save).toEqual(game);
  });

  test("registra o erro no console", () => {
    renderBroken();
    const calls = vi.mocked(console.error).mock.calls;
    expect(calls.some((args) => args.includes(boom))).toBe(true);
  });
});
