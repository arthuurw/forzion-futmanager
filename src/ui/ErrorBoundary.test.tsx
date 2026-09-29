// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../App";
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

describe("erro fora do render (correcoes-validacao)", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  /** The live screen of seed 3's first round, on fake timers; `tick` replaces the clock's action. */
  function startLive(tick?: () => void) {
    vi.useFakeTimers();
    useGame.setState({ phase: "squad", game: seededGame(3), hasSave: true, ...(tick ? { tick } : {}) });
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Jogar rodada" }));
    expect(useGame.getState().phase).toBe("live");
  }

  test("erro fora do render", async () => {
    // C51 (AC 47, L-005): the three ways an error escapes the render.
    const brokenTick = () => {
      throw new Error("tick quebrou");
    };
    const origins: [string, () => void | Promise<void>, (() => void)?][] = [
      [
        "exceção no tick do relógio",
        () => {
          act(() => {
            vi.advanceTimersByTime(1000);
          });
        },
        brokenTick,
      ],
      [
        "promise rejeitada em finishLive",
        async () => {
          // A live date that no longer matches the schedule: closing it throws.
          useGame.setState({ live: { ...useGame.getState().live!, roundIndex: 999 } });
          await act(async () => {
            fireEvent.click(screen.getByRole("button", { name: "Pular para o fim" }));
            await vi.advanceTimersByTimeAsync(10);
          });
        },
      ],
      [
        "evento unhandledrejection",
        () => {
          const event = Object.assign(new Event("unhandledrejection"), { reason: new Error("promessa esquecida") });
          act(() => {
            window.dispatchEvent(event);
          });
        },
      ],
    ];
    expect(origins).toHaveLength(3);
    for (const [origin, fail, tick] of origins) {
      resetAll();
      startLive(tick);
      expect(screen.queryByText("Algo deu errado"), origin).not.toBeInTheDocument();
      await fail();
      expect(screen.getByText("Algo deu errado"), origin).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Exportar jogo" }), origin).toBeInTheDocument();
      cleanup();
      vi.useRealTimers();
    }
  });
});
