// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { App } from "../App";
import { AI_FORMATION, autoLineup } from "../engine/lineup";
import { computeTable } from "../engine/table";
import type { Club, GameState } from "../engine/types";
import { useGame } from "../store";
import { resetAll, seededGame } from "./test-utils";

beforeEach(resetAll);

/** Written out here, not imported (L-004). */
const best11 = (c: Club) => [...c.players].map((p) => p.rating).sort((a, b) => b - a).slice(0, 11).reduce((a, b) => a + b, 0) / 11;
const LABEL = ["Série A", "Série B", "Liga Argentina", "Liga Portuguesa"];

describe("tela Demitido (carreira-dinamica)", () => {
  test("tela demitido", async () => {
    // C7: the round that fires, played through the store, opens the «Demitido» screen.
    const game: GameState = seededGame(3, 0, 12);
    const last = computeTable(game.leagues[0]!).at(-1)!.clubId;
    game.userClubId = last;
    const club = game.leagues[0]!.clubs.find((c) => c.id === last)!;
    club.lineup = autoLineup(club, AI_FORMATION);
    game.boardGoal = 1;
    game.cupGoal = -1;
    game.boardWarnings = 3;
    useGame.setState({ phase: "squad", game, hasSave: true });
    await useGame.getState().playRound();
    expect(useGame.getState().phase).toBe("live");
    await useGame.getState().skipToEnd();
    const after = useGame.getState().game!;
    expect(after.leagues[0]!.currentRound).toBe(13);
    expect(computeTable(after.leagues[0]!).findIndex((r) => r.clubId === last) + 1).toBeGreaterThan(5);
    expect(useGame.getState().phase).toBe("job");

    render(<App />);
    expect(screen.getByRole("heading", { name: "Demitido" })).toBeInTheDocument();
    expect(screen.getByText(`Você foi demitido do ${club.name} na rodada 13.`)).toBeInTheDocument();
    expect(screen.getByText("Reputação: 50/100")).toBeInTheDocument();
    const clubs = after.leagues.flatMap((l) => l.clubs);
    const ids = after.pendingJob!.clubIds;
    expect(ids).toHaveLength(3);
    const items = within(screen.getByRole("region", { name: "Propostas de emprego" })).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    items.forEach((li, i) => {
      const offered = clubs.find((c) => c.id === ids[i])!;
      const division = after.leagues.findIndex((l) => l.clubs.includes(offered));
      expect(li.textContent).toBe(`${offered.name} · ${LABEL[division]} · força ${best11(offered).toFixed(1)} Assumir`);
      expect(within(li).getByRole("button", { name: "Assumir" })).toBeEnabled();
    });
  });
});
