// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../App";
import { loadGame } from "../persistence/save";
import { newGame } from "../engine/generate";
import { bestElevenMean } from "../engine/lineup";
import { useGame } from "../store";
import { ChooseClub } from "./ChooseClub";
import { resetAll } from "./test-utils";

beforeEach(resetAll);

describe("tela Escolher clube", () => {
  test("lista 20 clubes em ordem alfabética com força", () => {
    const game = newGame(21);
    useGame.setState({ phase: "chooseClub", game });
    render(<ChooseClub />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(20);
    const clubs = [...game.leagues[0]!.clubs].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    buttons.forEach((button, i) => {
      const club = clubs[i]!;
      expect(button).toHaveTextContent(club.name);
      expect(button).toHaveTextContent(`força ${bestElevenMean(club).toFixed(1)}`);
    });
  });

  test("abas Série A e Série B", async () => {
    const user = userEvent.setup();
    const game = newGame(22);
    useGame.setState({ phase: "chooseClub", game });
    render(<App />);
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Série A", "Série B"]);
    const cards = () => screen.getAllByRole("button").filter((b) => b.classList.contains("club-card"));
    const expectDivision = (division: number) => {
      const clubs = [...game.leagues[division]!.clubs].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
      expect(cards()).toHaveLength(20);
      cards().forEach((card, i) => {
        expect(card).toHaveTextContent(clubs[i]!.name);
        expect(card).toHaveTextContent(`força ${bestElevenMean(clubs[i]!).toFixed(1)}`);
      });
      return clubs;
    };
    expectDivision(0);
    await user.click(screen.getByRole("tab", { name: "Série B" }));
    expect(screen.getByRole("tab", { name: "Série B" })).toHaveAttribute("aria-selected", "true");
    const serieB = expectDivision(1);
    const chosen = serieB[3]!;
    await user.click(cards()[3]!);
    expect(await screen.findByRole("heading", { name: chosen.name })).toBeInTheDocument();
    const saved = await loadGame();
    if (saved.kind !== "ok") throw new Error("no save");
    expect(saved.state.userClubId).toBe(chosen.id);
    expect(within(screen.getByRole("table", { name: "Elenco" })).getAllByRole("row")).toHaveLength(23);
  });
});
