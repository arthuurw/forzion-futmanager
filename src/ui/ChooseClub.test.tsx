// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
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
});
