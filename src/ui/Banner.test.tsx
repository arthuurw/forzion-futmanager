// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useGame, type SaveStatus } from "../store";
import { Banner } from "./Banner";
import { captureDownloads, resetAll, seededGame } from "./test-utils";

beforeEach(resetAll);
afterEach(() => vi.restoreAllMocks());

describe("faixa de aviso (correcoes-validacao)", () => {
  test("faixa oferece exportar quando não salva", async () => {
    // C10 (AC 10, L-005): the three save states.
    const rows: [SaveStatus, string | null][] = [
      ["failed", "Não foi possível salvar"],
      ["unavailable", "Salvamento indisponível neste navegador"],
      ["ok", null],
    ];
    expect(rows).toHaveLength(3);
    for (const [saveStatus, text] of rows) {
      useGame.setState({ saveStatus, game: seededGame(17) });
      const view = render(<Banner />);
      if (text) {
        expect(screen.getByText(text), saveStatus).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Exportar jogo" }), saveStatus).toBeInTheDocument();
      } else {
        expect(view.container).toBeEmptyDOMElement();
        expect(screen.queryByRole("button", { name: "Exportar jogo" })).not.toBeInTheDocument();
      }
      view.unmount();
    }

    // The button hands over the game in memory, in the envelope of AD-018.
    const user = userEvent.setup();
    const game = { ...seededGame(18), seed: 4321 };
    useGame.setState({ saveStatus: "failed", game });
    const files = captureDownloads();
    render(<Banner />);
    await user.click(screen.getByRole("button", { name: "Exportar jogo" }));
    expect(files).toHaveLength(1);
    const parsed = JSON.parse(await files[0]!.text) as { format: string; save: { seed: number } };
    expect(parsed.format).toBe("forzion-futmanager-save");
    expect(parsed.save.seed).toBe(4321);
  });
});
