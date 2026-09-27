// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { nextDate } from "../engine/calendar";
import { newGame } from "../engine/generate";
import { playDate } from "../engine/season";
import type { GameState } from "../engine/types";
import { useGame } from "../store";
import { Cup } from "./Cup";
import { resetAll } from "./test-utils";

beforeEach(resetAll);

const PHASES = ["Preliminar", "16 avos", "Oitavas", "Quartas", "Semifinal", "Final"];
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const nameOf = (s: GameState, id: string) => s.leagues.flatMap((l) => l.clubs).find((c) => c.id === id)!.name;

let full: GameState | null = null;
/** One whole season with no user, shared. */
function wholeSeason(): GameState {
  if (!full) {
    let s = newGame(111);
    while (nextDate(s).kind !== "over") s = playDate(s).state;
    full = s;
  }
  return clone(full);
}

function show(game: GameState) {
  useGame.setState({ phase: "cup", game });
  return render(<Cup />);
}

describe("tela Copa", () => {
  test("fases e confrontos", () => {
    const game = newGame(112);
    game.userClubId = game.leagues[0]!.clubs[0]!.id;
    const { unmount } = show(game);
    const regions = PHASES.map((p) => screen.getByRole("region", { name: p }));
    // In calendar order on the page.
    for (let i = 1; i < regions.length; i++) {
      expect(regions[i - 1]!.compareDocumentPosition(regions[i]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    const ties = within(regions[0]!).getAllByRole("listitem");
    expect(ties).toHaveLength(8);
    game.cups[0]!.phases[0]!.ties.forEach((t, i) => {
      expect(ties[i]).toHaveTextContent(nameOf(game, t.homeId));
      expect(ties[i]).toHaveTextContent(nameOf(game, t.awayId));
    });
    for (const region of regions.slice(1)) expect(within(region).getByText("a sortear")).toBeInTheDocument();
    unmount();

    // After the preliminary: its scores, and the drawn «16 avos».
    let s = game;
    while (s.cups[0]!.currentPhase === 0) s = playDate(s).state;
    show(s);
    const played = within(screen.getByRole("region", { name: "Preliminar" })).getAllByRole("listitem");
    s.cups[0]!.phases[0]!.ties.forEach((t, i) => {
      const r = t.result!;
      const score = `${r.homeGoals} x ${r.awayGoals}${t.penalties ? ` (pên. ${t.penalties.home} x ${t.penalties.away})` : ""}`;
      expect(played[i]).toHaveTextContent(`${nameOf(s, t.homeId)} ${score} ${nameOf(s, t.awayId)}`);
    });
    expect(within(screen.getByRole("region", { name: "16 avos" })).getAllByRole("listitem")).toHaveLength(16);
    expect(within(screen.getByRole("region", { name: "Oitavas" })).getByText("a sortear")).toBeInTheDocument();
  }, 60_000);

  test("situação do usuário", () => {
    const alive = newGame(113);
    alive.userClubId = alive.leagues[0]!.clubs[3]!.id;
    const first = show(alive);
    expect(screen.getByText(/Na disputa/)).toBeInTheDocument();
    first.unmount();

    const s = wholeSeason();
    const cup = s.cups[0]!;
    const oitavas = cup.phases[2]!.ties[0]!;
    const out = oitavas.winnerId === oitavas.homeId ? oitavas.awayId : oitavas.homeId;
    const second = show({ ...s, userClubId: out });
    expect(screen.getByText(/Eliminado na Oitavas/)).toBeInTheDocument();
    second.unmount();

    show({ ...s, userClubId: cup.phases[5]!.ties[0]!.winnerId });
    expect(screen.getByText(/^Campeão/)).toBeInTheDocument();
    expect(screen.queryByText(/Na disputa|Eliminado/)).not.toBeInTheDocument();
  }, 60_000);

  test("placar com pênaltis na copa", () => {
    const s = wholeSeason();
    const tie = s.cups[0]!.phases[0]!.ties[0]!;
    tie.result = { homeGoals: 1, awayGoals: 1, goals: [] };
    tie.penalties = { home: 4, away: 3 };
    tie.winnerId = tie.homeId;
    s.userClubId = tie.homeId;
    show(s);
    const item = within(screen.getByRole("region", { name: "Preliminar" })).getAllByRole("listitem")[0]!;
    expect(item).toHaveTextContent("1 x 1 (pên. 4 x 3)");
  }, 60_000);
});
