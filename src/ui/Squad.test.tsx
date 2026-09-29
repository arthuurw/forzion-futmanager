// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../App";
import { playDate } from "../engine/season";
import { POSITIONS, type GameState } from "../engine/types";
import { useGame, userClub } from "../store";
import { Squad } from "./Squad";
import { preliminaryWithCupSuspended, resetAll, seededGame, seededGameIn, skipLive } from "./test-utils";
import { computeTable } from "../engine/table";
import { AI_FORMATION, autoLineup } from "../engine/lineup";

beforeEach(resetAll);

/** Written out here, not imported (L-004). */
const brl = (n: number) => `${n < 0 ? "-" : ""}R$ ${String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

describe("tela Elenco", () => {
  test("22 jogadores ordenados por posição e força", () => {
    const game = seededGame(4, 2);
    useGame.setState({ phase: "squad", game });
    render(<Squad />);
    const rows = within(screen.getByRole("table", { name: "Elenco" })).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(22);
    const club = userClub(game)!;
    const expected = [...club.players].sort(
      (a, b) => POSITIONS.indexOf(a.position) - POSITIONS.indexOf(b.position) || b.rating - a.rating || a.name.localeCompare(b.name),
    );
    rows.forEach((row, i) => {
      const cells = within(row).getAllByRole("cell").map((c) => c.textContent);
      const p = expected[i]!;
      expect(cells[0]).toBe(p.name);
      expect(cells[2]).toBe(String(p.age));
      expect(cells[3]).toBe(String(p.rating));
    });
    const positionsInOrder = rows.map((r) => within(r).getAllByRole("cell")[1]!.textContent);
    expect(positionsInOrder.join(",")).toBe([...Array(3).fill("GOL"), ...Array(7).fill("ZAG"), ...Array(7).fill("MEI"), ...Array(5).fill("ATA")].join(","));
  });

  test("oferece 4-4-2 4-3-3 3-5-2 4-5-1", () => {
    useGame.setState({ phase: "squad", game: seededGame() });
    render(<Squad />);
    const options = within(screen.getByLabelText("Formação")).getAllByRole("option").map((o) => o.textContent);
    expect(options).toEqual(["4-4-2", "4-3-3", "3-5-2", "4-5-1"]);
  });

  test("escalação incompleta desabilita Jogar rodada", async () => {
    const user = userEvent.setup();
    useGame.setState({ phase: "squad", game: seededGame() });
    render(<Squad />);
    const play = screen.getByRole("button", { name: "Jogar rodada" });
    expect(play).toBeEnabled();
    expect(screen.queryByText(/Faltam/)).not.toBeInTheDocument();

    // Move the starter of the first DF slot into the second DF slot: the first slot empties.
    const slot2 = screen.getByLabelText("Titular 2 (ZAG)") as HTMLSelectElement;
    const slot3 = screen.getByLabelText("Titular 3 (ZAG)") as HTMLSelectElement;
    await user.selectOptions(slot3, slot2.value);
    expect(screen.getByText("Falta 1 titular")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Jogar rodada" })).toBeDisabled();

    // Selecting a bench DF (not starting anywhere) for the empty slot makes it valid again.
    const empty = screen.getByLabelText("Titular 2 (ZAG)") as HTMLSelectElement;
    expect(empty.value).toBe("");
    const starting = new Set(userClub(useGame.getState().game!)!.lineup!.starters);
    const spare = [...empty.options].map((o) => o.value).find((v) => v && !starting.has(v))!;
    expect(spare).toBeTruthy();
    await user.selectOptions(empty, spare);
    expect(screen.queryByText(/Faltam/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Jogar rodada" })).toBeEnabled();
  });

  test("suspenso fica fora com selo SUS", () => {
    const game = seededGame(4, 2);
    const club = userClub(game)!;
    const benchDf = club.players.find((p) => p.position === "DF" && !club.lineup!.starters.includes(p.id))!;
    benchDf.suspendedRounds = 1;
    useGame.setState({ phase: "squad", game });
    render(<Squad />);
    const row = within(screen.getByRole("table", { name: "Elenco" })).getByText(benchDf.name).closest("tr")!;
    expect(within(row).getByText("SUS")).toBeInTheDocument();
    const slot = screen.getByLabelText("Titular 2 (ZAG)") as HTMLSelectElement;
    expect([...slot.options].map((o) => o.value)).not.toContain(benchDf.id);
  });

  test("lesionado fica fora com selo LES e rodadas", () => {
    const game = seededGame(4, 2);
    const club = userClub(game)!;
    const benchMf = club.players.find((p) => p.position === "MF" && !club.lineup!.starters.includes(p.id))!;
    benchMf.injuryRounds = 3;
    useGame.setState({ phase: "squad", game });
    render(<Squad />);
    const row = within(screen.getByRole("table", { name: "Elenco" })).getByText(benchMf.name).closest("tr")!;
    expect(within(row).getByText("LES 3")).toBeInTheDocument();
    for (const select of screen.getAllByLabelText(/^Titular /) as HTMLSelectElement[]) {
      expect([...select.options].map((o) => o.value)).not.toContain(benchMf.id);
    }
  });

  test("escalação com indisponível desabilita", () => {
    const game = seededGame(4, 2);
    const club = userClub(game)!;
    const starter = club.players.find((p) => p.id === club.lineup!.starters[1])!;
    starter.injuryRounds = 2;
    useGame.setState({ phase: "squad", game });
    render(<Squad />);
    expect(screen.getByText("Falta 1 titular")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Jogar rodada" })).toBeDisabled();
  });

  test("setas de moral em 5 níveis", () => {
    const game = seededGame(4, 2);
    const club = userClub(game)!;
    const levels: [number, string, string][] = [
      [-2, "↓", "mn2"],
      [-1, "↘", "mn1"],
      [0, "→", "mp0"],
      [1, "↗", "mp1"],
      [2, "↑", "mp2"],
    ];
    levels.forEach(([morale], i) => (club.players[i]!.morale = morale));
    useGame.setState({ phase: "squad", game });
    render(<Squad />);
    const table = screen.getByRole("table", { name: "Elenco" });
    levels.forEach(([, arrow, cls], i) => {
      const row = within(table).getByText(club.players[i]!.name).closest("tr")!;
      const el = row.querySelector(".morale")!;
      expect(el.textContent).toBe(arrow);
      expect(el).toHaveClass(cls);
    });
  });

  test("slot aceita outra posição e marca fora de posição", async () => {
    const user = userEvent.setup();
    const game = seededGame(4, 2);
    const club = userClub(game)!;
    const benchDf = club.players.find((p) => p.position === "DF" && !club.lineup!.starters.includes(p.id))!;
    useGame.setState({ phase: "squad", game });
    render(<Squad />);
    expect(screen.queryByText("fora de posição")).not.toBeInTheDocument();
    // Every slot offers an available bench player of each of the 4 positions, its own and the 3 foreign ones.
    for (const pos of POSITIONS) {
      const spare = club.players.find((p) => p.position === pos && !club.lineup!.starters.includes(p.id))!;
      expect(spare).toBeTruthy();
      for (const select of screen.getAllByLabelText(/^Titular /) as HTMLSelectElement[]) {
        expect([...select.options].map((o) => o.value)).toContain(spare.id);
      }
    }
    const fwSlot = screen.getByLabelText("Titular 11 (ATA)") as HTMLSelectElement;
    await user.selectOptions(fwSlot, benchDf.id);
    expect(fwSlot.closest(".token")).toHaveClass("oop");
    expect(screen.getByText("fora de posição")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Jogar rodada" })).toBeEnabled();
  });

  test("coluna salário", () => {
    const game = seededGame(4, 2);
    const club = userClub(game)!;
    useGame.setState({ phase: "squad", game });
    render(<Squad />);
    const table = screen.getByRole("table", { name: "Elenco" });
    const headers = within(table).getAllByRole("columnheader").map((h) => h.textContent);
    const col = headers.indexOf("Salário");
    expect(col).toBeGreaterThan(-1);
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(22);
    for (const row of rows) {
      const cells = within(row).getAllByRole("cell");
      const player = club.players.find((p) => p.name === cells[0]!.textContent)!;
      expect(cells[col]!.textContent, player.name).toBe(brl(player.salary));
    }
  });

  test("marcar à venda", async () => {
    const user = userEvent.setup();
    const game = seededGame(4, 2);
    const player = userClub(game)!.players[7]!;
    useGame.setState({ phase: "squad", game, hasSave: true });
    render(<Squad />);
    await user.click(screen.getByRole("checkbox", { name: `À venda: ${player.name}` }));
    await vi.waitFor(() => expect(userClub(useGame.getState().game!)!.forSale).toEqual([player.id]));
    expect(screen.getByRole("checkbox", { name: `À venda: ${player.name}` })).toBeChecked();
    await user.click(screen.getByRole("checkbox", { name: `À venda: ${player.name}` }));
    await vi.waitFor(() => expect(userClub(useGame.getState().game!)!.forSale).toEqual([]));
  });

  test("marcar à venda só com mercado aberto", () => {
    useGame.setState({ phase: "squad", game: seededGame(4, 2, 5), hasSave: true });
    render(<Squad />);
    expect(screen.queryAllByRole("checkbox", { name: /^À venda/ })).toHaveLength(0);
    expect(screen.queryAllByRole("button", { name: /^Dispensar/ })).toHaveLength(0);
  });

  test("dispensar com confirmação", async () => {
    const user = userEvent.setup();
    const game = seededGame(4, 2);
    const club = userClub(game)!;
    const player = club.players.find((p) => !club.lineup!.starters.includes(p.id))!;
    useGame.setState({ phase: "squad", game, hasSave: true });
    render(<Squad />);
    await user.click(screen.getByRole("button", { name: `Dispensar ${player.name}` }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent(`Dispensar ${player.name} custa ${brl(4 * player.salary)}. Confirmar?`);
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(useGame.getState().game).toBe(game);
    await user.click(screen.getByRole("button", { name: `Dispensar ${player.name}` }));
    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    await vi.waitFor(() => expect(useGame.getState().game).not.toBe(game));
    const after = useGame.getState().game!;
    expect(userClub(after)!.finance.cash).toBe(club.finance.cash - 4 * player.salary);
    expect(userClub(after)!.players.map((p) => p.id)).not.toContain(player.id);
    expect(after.market.freeAgents.map((p) => p.id)).toContain(player.id);
  });

});

/** Written out here, not imported (L-004). */
const expectedSalary = (rating: number) => Math.round((2000 * 1.09 ** (rating - 40)) / 100) * 100;

describe("elenco com divisões, contratos e meta", () => {
  test("classificação com seletor de divisão", async () => {
    const user = userEvent.setup();
    const game = seededGameIn(1, 26, 3, 2);
    useGame.setState({ phase: "squad", game });
    render(<Squad />);
    const names = () => within(screen.getByRole("table", { name: "Classificação" })).getAllByRole("row").slice(1).map((r) => r.querySelector(".club-name-text")!.textContent);
    const select = screen.getByLabelText("Divisão") as HTMLSelectElement;
    // Paises (Superseded checks): the 4 leagues.
    expect([...select.options].map((o) => o.textContent)).toEqual(["Série A", "Série B", "Liga Argentina", "Liga Portuguesa"]);
    expect(select.selectedOptions[0]!.textContent).toBe("Série B");
    expect(names()).toEqual(computeTable(game.leagues[1]!).map((r) => r.name));
    await user.selectOptions(select, "Série A");
    expect(names()).toEqual(computeTable(game.leagues[0]!).map((r) => r.name));
    expect(names()).toHaveLength(20);
  });

  test("coluna contrato e último ano", () => {
    const game = seededGame(27);
    userClub(game)!.players.forEach((p, i) => (p.contractSeasons = 1 + (i % 4)));
    useGame.setState({ phase: "squad", game });
    render(<Squad />);
    const table = screen.getByRole("table", { name: "Elenco" });
    const headers = within(table).getAllByRole("columnheader").map((h) => h.textContent);
    const col = headers.indexOf("Contr.");
    expect(col).toBe(headers.indexOf("Salário") + 1);
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(22);
    let lastYear = 0;
    for (const r of rows) {
      const cells = within(r).getAllByRole("cell");
      const p = userClub(game)!.players.find((x) => x.name === cells[0]!.textContent)!;
      const cell = cells[col]!;
      expect(cell.textContent!.startsWith(String(p.contractSeasons)), p.name).toBe(true);
      expect(within(cell).queryByText("Último ano") !== null, p.name).toBe(p.contractSeasons === 1);
      if (p.contractSeasons === 1) lastYear++;
    }
    expect(lastYear).toBeGreaterThan(0);
  });

  test("renovar mostra salário novo", async () => {
    const user = userEvent.setup();
    const game = seededGame(28);
    const [last, other] = userClub(game)!.players;
    Object.assign(last!, { contractSeasons: 1, rating: 77, salary: 5_000 });
    Object.assign(other!, { contractSeasons: 2 });
    // The rest spread over 1 to 4, so the rule is checked on every row, not on one sample.
    userClub(game)!.players.slice(2).forEach((p, i) => (p.contractSeasons = 1 + (i % 4)));
    useGame.setState({ phase: "squad", game, hasSave: true });
    render(<Squad />);
    expect(screen.queryByRole("button", { name: `Renovar ${other!.name}` })).not.toBeInTheDocument();
    // Every row: «Renovar» exactly on the last-year contracts.
    for (const p of userClub(game)!.players) {
      const has = screen.queryByRole("button", { name: `Renovar ${p.name}` }) !== null;
      expect(has, `${p.name} contrato ${p.contractSeasons}`).toBe(p.contractSeasons === 1);
    }
    expect(screen.getAllByRole("button", { name: /^Renovar / })).toHaveLength(userClub(game)!.players.filter((p) => p.contractSeasons === 1).length);
    const y = expectedSalary(77);
    await user.click(screen.getByRole("button", { name: `Renovar ${last!.name}` }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent(`Renovar ${last!.name} por 3 temporadas com salário ${brl(y)} por rodada. Confirmar?`);
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(userClub(useGame.getState().game!)!.players[0]).toMatchObject({ contractSeasons: 1, salary: 5_000 });
    await user.click(screen.getByRole("button", { name: `Renovar ${last!.name}` }));
    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    await vi.waitFor(() => expect(userClub(useGame.getState().game!)!.players[0]).toMatchObject({ contractSeasons: 3, salary: y }));
    expect(screen.queryByRole("button", { name: `Renovar ${last!.name}` })).not.toBeInTheDocument();
  });

  test("meta da temporada", () => {
    const cases: [number, number, string][] = [
      [0, 8, "Meta: até o 8º"],
      [0, 16, "Meta: não cair"],
      [1, 4, "Meta: subir"],
    ];
    for (const [division, goal, text] of cases) {
      resetAll();
      const game = seededGameIn(division, 29);
      game.boardGoal = goal;
      useGame.setState({ phase: "squad", game });
      const view = render(<Squad />);
      expect(screen.getByText(text)).toBeInTheDocument();
      view.unmount();
    }
  });
});

describe("elenco com a copa (copa-nacional)", () => {
  test("próxima data de copa no elenco", () => {
    const game = seededGame(101, 0, 4);
    useGame.setState({ phase: "squad", game });
    const { unmount } = render(<Squad />);
    expect(screen.getByText("Copa Nacional · Preliminar")).toBeInTheDocument();
    expect(screen.queryByText(/^Rodada \d+ de 38$/)).not.toBeInTheDocument();
    unmount();
    useGame.setState({ game: playDate(game).state });
    render(<Squad />);
    expect(screen.getByText("Rodada 5 de 38")).toBeInTheDocument();
    expect(screen.queryByText(/Copa Nacional ·/)).not.toBeInTheDocument();
  });

  test("suspensões pela próxima data", () => {
    const rowOf = (name: string) => within(screen.getByRole("table", { name: "Elenco" })).getByText(name).closest("tr")!;
    const mark = (game: GameState) => {
      const club = userClub(game)!;
      const bench = club.players.filter((p) => !club.lineup!.starters.includes(p.id) && p.injuryRounds === 0);
      const [cupOnly, leagueOnly] = [bench[0]!, bench[1]!];
      cupOnly.cupDiscipline = { "cup-nat": { yellowCards: 0, suspendedRounds: 1 } };
      cupOnly.suspendedRounds = 0;
      leagueOnly.suspendedRounds = 1;
      return { cupOnly, leagueOnly };
    };
    // Next date: the cup's preliminary, which the user plays (ajustes-4a: a cup date without the
    // user reads the league). Seed 102's Série B club 0 is in the Preliminar.
    const cupNext = seededGameIn(1, 102, 0, 4);
    expect(cupNext.cups[0]!.phases[0]!.ties.some((t) => t.homeId === cupNext.userClubId || t.awayId === cupNext.userClubId)).toBe(true);
    const a = mark(cupNext);
    useGame.setState({ phase: "squad", game: cupNext });
    const { unmount } = render(<Squad />);
    expect(within(rowOf(a.cupOnly.name)).getByText("Suspenso (copa)")).toBeInTheDocument();
    expect(rowOf(a.cupOnly.name)).toHaveClass("out");
    expect(within(rowOf(a.leagueOnly.name)).queryByText(/SUS|Suspenso/)).not.toBeInTheDocument();
    expect(rowOf(a.leagueOnly.name)).not.toHaveClass("out");
    unmount();
    // Next date: a league round.
    const leagueNext = seededGame(102, 0, 5);
    const b = mark(leagueNext);
    useGame.setState({ phase: "squad", game: leagueNext });
    render(<Squad />);
    expect(within(rowOf(b.leagueOnly.name)).getByText("SUS")).toBeInTheDocument();
    expect(rowOf(b.leagueOnly.name)).toHaveClass("out");
    expect(within(rowOf(b.cupOnly.name)).queryByText(/SUS|Suspenso/)).not.toBeInTheDocument();
    expect(rowOf(b.cupOnly.name)).not.toHaveClass("out");
  });

  test("botão copa", async () => {
    const user = userEvent.setup();
    useGame.setState({ phase: "squad", game: seededGame(103), hasSave: true });
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Copa" }));
    expect(screen.getByRole("heading", { level: 1, name: "Copa Nacional" })).toBeInTheDocument();
    expect(useGame.getState().phase).toBe("cup");
  });
});

describe("elenco em data de copa sem o usuário (ajustes-4a)", () => {
  test("data de copa sem o usuário libera o suspenso de copa", () => {
    const rowOf = (name: string) => within(screen.getByRole("table", { name: "Elenco" })).getByText(name).closest("tr")!;
    // The top seed skips the Preliminar: the next date is the cup's, without the user.
    const off = preliminaryWithCupSuspended(141, (s) => s.cups[0]!.seeding[0]!);
    expect(off.game.cups[0]!.phases[0]!.ties.some((t) => t.homeId === off.game.userClubId || t.awayId === off.game.userClubId)).toBe(false);
    useGame.setState({ phase: "squad", game: off.game });
    const { unmount } = render(<Squad />);
    expect(screen.getByText("Copa Nacional · Preliminar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Jogar rodada" })).toBeEnabled();
    expect(screen.queryByText(/Faltam/)).not.toBeInTheDocument();
    expect(within(rowOf(off.suspended.name)).queryByText("Suspenso (copa)")).not.toBeInTheDocument();
    expect(rowOf(off.suspended.name)).not.toHaveClass("out");
    unmount();
    // A club in the Preliminar: blocked and marked, as before.
    const on = preliminaryWithCupSuspended(141, (s) => s.cups[0]!.phases[0]!.ties[0]!.homeId);
    useGame.setState({ phase: "squad", game: on.game });
    render(<Squad />);
    expect(screen.getByRole("button", { name: "Jogar rodada" })).toBeDisabled();
    expect(screen.getByText("Falta 1 titular")).toBeInTheDocument();
    expect(within(rowOf(on.suspended.name)).getByText("Suspenso (copa)")).toBeInTheDocument();
    expect(rowOf(on.suspended.name)).toHaveClass("out");
  });
});

describe("textos do elenco (correcoes-validacao)", () => {
  test("concordância de titulares", () => {
    // C40 (AC 36, L-008): 1 and 3 empty slots, with the whole squad available.
    const rows: [number, string][] = [
      [1, "Falta 1 titular"],
      [3, "Faltam 3 titulares"],
    ];
    for (const [empty, text] of rows) {
      const game = seededGame(5);
      const club = userClub(game)!;
      for (const p of club.players) Object.assign(p, { injuryRounds: 0, suspendedRounds: 0 });
      club.lineup = { ...club.lineup!, starters: club.lineup!.starters.map((id, i) => (i >= 1 && i <= empty ? null : id)) };
      useGame.setState({ phase: "squad", game });
      const view = render(<Squad />);
      expect(screen.getByRole("status"), text).toHaveTextContent(text);
      expect(screen.getByText(text)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Jogar rodada" })).toBeDisabled();
      view.unmount();
    }
  });
});

describe("elenco curto (correcoes-validacao)", () => {
  test("joga com vaga quando faltam aptos", async () => {
    // C18 (AC 16, AC 17, L-003): 10 available, all in the eleven; the rest out for 5 rounds.
    const user = userEvent.setup();
    const game = seededGame(12);
    const me = userClub(game)!;
    me.players.forEach((p, i) => Object.assign(p, { injuryRounds: i < 10 ? 0 : 5, suspendedRounds: 0 }));
    me.lineup = autoLineup(me, AI_FORMATION);
    expect(me.lineup.starters.filter((id) => id === null)).toHaveLength(1);
    useGame.setState({ phase: "squad", game, hasSave: true });
    render(<App />);
    const play = screen.getByRole("button", { name: "Jogar rodada" });
    expect(play).toBeEnabled();
    expect(screen.queryByText(/Falta/)).not.toBeInTheDocument();
    await user.click(play);
    await skipLive(user);
    await screen.findByRole("region", { name: "Sua partida" });
    expect(useGame.getState().phase).toBe("round");
    expect(useGame.getState().lastRound!.results.some((r) => r.homeId === me.id || r.awayId === me.id)).toBe(true);
    expect(screen.getByRole("button", { name: "Jogar rodada" })).toBeEnabled();
  }, 60_000);
});
