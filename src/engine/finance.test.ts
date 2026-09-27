import {
  attendanceFor,
  capacityFor,
  closeRoundFinances,
  expandStadium,
  fansFor,
  formFactor,
  interestFor,
  positionsBeforeRound,
  repayLoan,
  salaryFor,
  takeLoan,
} from "./finance";
import { generateLeague, newGame } from "./generate";
import { AI_FORMATION, autoLineup } from "./lineup";
import { acceptOffer, buyPlayer, releasePlayer, signFreeAgent } from "./market";
import { migrateSave } from "./migrate";
import { createRng } from "./rng";
import { playRound } from "./season";
import { computeTable } from "./table";
import { busySeason, zeroAiSurplus } from "./test-fixtures";
import type { Club, GameState } from "./types";

/** Written out here, not imported: the test must not share the production formula (L-004). */
const expectedSalary = (rating: number) => Math.round((2000 * 1.09 ** (rating - 40)) / 100) * 100;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

function game(seed = 1): GameState {
  const state = newGame(seed);
  const club = state.leagues[0]!.clubs[0]!;
  state.userClubId = club.id;
  club.lineup = autoLineup(club, AI_FORMATION);
  return state;
}

const user = (s: GameState): Club => s.leagues[0]!.clubs.find((c) => c.id === s.userClubId)!;
const clubById = (s: GameState, id: string): Club => s.leagues[0]!.clubs.find((c) => c.id === id)!;

describe("finanças (engine)", () => {
  test("todo dinheiro do save é inteiro", () => {
    const state = busySeason();
    const amounts: [string, number][] = [];
    for (const c of state.leagues[0]!.clubs) {
      const f = c.finance;
      for (const k of ["cash", "sponsorship", "ticketPrice", "loan", "loanLimit", "pendingIn", "pendingOut"] as const) amounts.push([`${c.id}.${k}`, f[k]]);
      expect(f.lastRound).not.toBeNull();
      for (const [k, v] of Object.entries(f.lastRound!)) amounts.push([`${c.id}.lastRound.${k}`, v]);
      for (const p of c.players) amounts.push([`${p.id}.salary`, p.salary]);
    }
    for (const p of [...state.market.freeAgents, ...state.market.juniors]) amounts.push([`${p.id}.salary`, p.salary]);
    for (const o of state.market.offers) amounts.push([`${o.id}.amount`, o.amount]);
    // The scenario really moved money: loan, works, transfers.
    expect(user(state).finance.loan).toBeGreaterThan(0);
    for (const [where, v] of amounts) expect(Number.isInteger(v), where).toBe(true);
  });

  test("salário por força", () => {
    expect(salaryFor(40)).toBe(2000);
    expect(salaryFor(60)).toBe(11200);
    expect(salaryFor(75)).toBe(40800);
    expect(salaryFor(95)).toBe(228800);
    const state = newGame(5);
    const everyone = [...state.leagues[0]!.clubs.flatMap((c) => c.players), ...state.market.freeAgents, ...state.market.juniors];
    expect(everyone.length).toBe(20 * 22 + 40 + 3);
    for (const p of everyone) expect(p.salary, p.id).toBe(expectedSalary(p.rating));
  });

  test("caixa inicial 10 folhas", () => {
    const state = newGame(6);
    expect(state.leagues[0]!.clubs).toHaveLength(20);
    for (const c of state.leagues[0]!.clubs) {
      const wages = sum(c.players.map((p) => expectedSalary(p.rating)));
      expect(c.finance.cash, c.id).toBe(Math.round((wages * 10) / 100_000) * 100_000);
    }
  });

  test("torcida e capacidade", () => {
    expect(fansFor(58)).toBe(15_000);
    expect(fansFor(69)).toBe(38_000);
    expect(fansFor(80)).toBe(60_000);
    expect(fansFor(50)).toBe(15_000);
    expect(fansFor(90)).toBe(60_000);
    expect(capacityFor(38_000)).toBe(30_000);
    expect(capacityFor(15_000)).toBe(12_000);
    expect(capacityFor(60_000)).toBe(48_000);
    for (const c of newGame(7).leagues[0]!.clubs) {
      const mean = sum(c.players.map((p) => p.rating)) / c.players.length;
      const fans = Math.round(Math.min(60_000, Math.max(15_000, 15_000 + (45_000 * (mean - 58)) / 22)) / 1000) * 1000;
      expect(c.finance.fans, c.id).toBe(fans);
      expect(c.finance.capacity, c.id).toBe(Math.round((fans * 0.8) / 1000) * 1000);
    }
  });

  test("rodada paga salários e patrocínio", () => {
    const before = game(8);
    const loaned = takeLoan(user(before).finance, 1_000_000);
    if (!loaned.ok) throw new Error("loan refused");
    user(before).finance = loaned.finance;
    const after = playRound(before).state;
    expect(after.leagues[0]!.clubs).toHaveLength(20);
    for (const c of before.leagues[0]!.clubs) {
      const a = clubById(after, c.id);
      const l = a.finance.lastRound!;
      expect(l.salaries, c.id).toBe(sum(c.players.map((p) => p.salary)));
      expect(l.sponsorship, c.id).toBe(c.finance.sponsorship);
      expect(l.interest, c.id).toBe(c.id === before.userClubId ? 15_000 : 0);
      expect(a.finance.cash - c.finance.cash, c.id).toBe(l.sponsorship - l.salaries + l.tickets - l.interest);
    }
  });

  test("bilheteria só do mandante", () => {
    const before = game(9);
    const after = playRound(before).state;
    const matches = after.leagues[0]!.rounds[0]!.matches;
    expect(matches).toHaveLength(10);
    for (const m of matches) {
      const home = clubById(after, m.homeId).finance;
      const away = clubById(after, m.awayId).finance;
      expect(home.lastRound!.attendance, m.id).toBeGreaterThan(0);
      expect(home.lastRound!.tickets, m.id).toBe(home.lastRound!.attendance * home.ticketPrice);
      expect(away.lastRound!.attendance, m.id).toBe(0);
      expect(away.lastRound!.tickets, m.id).toBe(0);
    }
  });

  test("público por preço fase e capacidade", () => {
    const stadium = { fans: 30_000, capacity: 50_000 };
    const before = formFactor(null, 20);
    expect(attendanceFor(stadium, 20, before)).toBe(39_000);
    expect(attendanceFor(stadium, 40, before)).toBe(30_000);
    expect(attendanceFor(stadium, 80, before)).toBe(10_606);
    expect(attendanceFor({ fans: 30_000, capacity: 24_000 }, 40, before)).toBe(24_000);
    expect(attendanceFor(stadium, 40, formFactor(1, 20))).toBe(36_000);
    expect(attendanceFor(stadium, 40, formFactor(20, 20))).toBe(24_000);
    // Before the first round nobody has a position; after it, all 20 do.
    const start = game(10);
    expect([...positionsBeforeRound(start.leagues[0]!).values()]).toEqual(Array(20).fill(null));
    const later = playRound(start).state;
    expect([...positionsBeforeRound(later.leagues[0]!).values()].sort((a, b) => a! - b!)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });

  test("ampliação fica pronta em 6 rodadas", () => {
    let state = game(11);
    const f = user(state).finance;
    const capacity = f.capacity;
    const r = expandStadium({ ...f, cash: 10_000_000 });
    if (!r.ok) throw new Error(r.reason);
    expect(r.finance.cash).toBe(6_000_000);
    user(state).finance = r.finance;
    for (let i = 1; i <= 5; i++) {
      state = playRound(state).state;
      expect(user(state).finance.capacity, `rodada ${i}`).toBe(capacity);
    }
    state = playRound(state).state;
    expect(user(state).finance.capacity).toBe(capacity + 5_000);
    expect(user(state).finance.expansionRoundsLeft).toBe(0);
  });

  test("capacidade máxima 80000", () => {
    const f = { ...user(game(12)).finance, cash: 10_000_000 };
    expect(expandStadium({ ...f, capacity: 76_000 })).toEqual({ ok: false, reason: "max_capacity" });
    const ok = expandStadium({ ...f, capacity: 75_000 });
    expect(ok.ok).toBe(true);
  });

  test("empréstimo em múltiplos até o limite", () => {
    const state = game(13);
    for (const c of state.leagues[0]!.clubs) expect(c.finance.loanLimit, c.id).toBe(2 * c.finance.cash);
    const f = user(state).finance;
    const a = takeLoan(f, 500_000);
    const b = takeLoan(f, 1_000_000);
    expect(a.ok && a.finance.loan).toBe(500_000);
    expect(a.ok && a.finance.cash).toBe(f.cash + 500_000);
    expect(b.ok && b.finance.loan).toBe(1_000_000);
    expect(takeLoan(f, 700_000)).toEqual({ ok: false, reason: "invalid" });
    // The debt can grow up to 2 × the initial cash: the largest multiple that fits is accepted, the next one is not.
    const limit = 2 * f.cash;
    const fits = Math.floor(limit / 500_000) * 500_000;
    const full = takeLoan(f, fits);
    expect(full.ok && full.finance.loan).toBe(fits);
    expect(takeLoan(f, fits + 500_000)).toMatchObject({ ok: false, reason: "loan_limit" });
  });

  test("empréstimo acima do limite", () => {
    const f = { ...user(game(14)).finance, loanLimit: 3_000_000, loan: 2_000_000 };
    expect(takeLoan(f, 1_500_000)).toEqual({ ok: false, reason: "loan_limit", amount: 1_000_000 });
    expect(takeLoan(f, 1_000_000).ok).toBe(true);
  });

  test("juros de 1,5% por rodada", () => {
    expect(interestFor(1_000_000)).toBe(15_000);
    expect(interestFor(1_234_567)).toBe(18_500);
    expect(interestFor(0)).toBe(0);
  });

  test("pagar empréstimo", () => {
    const f = { ...user(game(15)).finance, loan: 1_500_000, cash: 5_000_000 };
    const half = repayLoan(f, 500_000);
    expect(half.ok && half.finance.loan).toBe(1_000_000);
    expect(half.ok && half.finance.cash).toBe(4_500_000);
    const all = repayLoan(f, 1_500_000);
    expect(all.ok && all.finance.loan).toBe(0);
    expect(repayLoan(f, 2_000_000)).toEqual({ ok: false, reason: "over_debt" });
    // An odd balance can still be paid off whole.
    const odd = repayLoan({ ...f, loan: 1_234_567 }, 1_234_567);
    expect(odd.ok && odd.finance.loan).toBe(0);
  });

  test("caixa negativo bloqueia gastos e paga salários", () => {
    const state = game(16);
    const me = user(state);
    me.finance.cash = -100_000;
    const seller = state.leagues[0]!.clubs[1]!;
    const reserve = [...seller.players].sort((a, b) => a.rating - b.rating)[0]!;
    expect(buyPlayer(state, reserve.id, 10_000_000)).toMatchObject({ ok: false, reason: "cash" });
    expect(signFreeAgent(state, state.market.freeAgents[0]!.id)).toMatchObject({ ok: false, reason: "cash" });
    expect(releasePlayer(state, me.players[21]!.id)).toMatchObject({ ok: false, reason: "cash" });
    expect(expandStadium(me.finance)).toMatchObject({ ok: false, reason: "cash" });
    const after = playRound(state).state;
    const l = user(after).finance.lastRound!;
    expect(l.salaries).toBe(sum(me.players.map((p) => p.salary)));
    expect(user(after).finance.cash).toBe(-100_000 + l.sponsorship + l.tickets - l.salaries);
  });

  test("salário guardado não segue a força", () => {
    const state = game(17);
    const p = user(state).players[0]!;
    const salary = p.salary;
    p.rating = 95;
    const after = playRound(state).state;
    const same = user(after).players.find((x) => x.id === p.id)!;
    expect(same.rating).toBe(95);
    expect(same.salary).toBe(salary);
    const reread = migrateSave(JSON.parse(JSON.stringify(after)));
    if (reread.kind !== "ok") throw new Error("reread failed");
    expect(user(reread.state).players.find((x) => x.id === p.id)!.salary).toBe(salary);
  });

  test("público da rodada usa a fase antes da rodada", () => {
    // Wiring of AC 7 through the round close: round 2 uses the table after round 1.
    let state = game(20);
    state = playRound(state).state;
    const league = state.leagues[0]!;
    const table = computeTable(league);
    const round = league.rounds[league.currentRound]!;
    user(state).lineup = autoLineup(user(state), AI_FORMATION);
    const after = playRound(state).state;
    for (const m of round.matches) {
      const f = clubById(state, m.homeId).finance;
      const pos = table.findIndex((r) => r.clubId === m.homeId) + 1;
      const form = 1.2 - (0.4 * (pos - 1)) / 19;
      const expected = Math.min(f.capacity, Math.floor(f.fans * Math.min(1.3, (40 / f.ticketPrice) ** 1.5) * form + 1e-6));
      expect(clubById(after, m.homeId).finance.lastRound!.attendance, m.id).toBe(expected);
    }
  });

  test("transferências entram no registro da rodada seguinte", () => {
    let state = game(22);
    const seller = clubById(state, state.leagues[0]!.clubs[3]!.id);
    const target = seller.players.filter((p) => p.position === "GK").sort((a, b) => a.rating - b.rating)[0]!;
    const price = Math.round((target.salary * 50 * (target.age <= 21 ? 1.5 : target.age <= 27 ? 1.2 : target.age <= 30 ? 1 : target.age <= 33 ? 0.6 : 0.3)) / 10_000) * 10_000;
    const bought = buyPlayer(state, target.id, price);
    if (!bought.ok) throw new Error(bought.reason);
    state = bought.state;
    const buyer = state.leagues[0]!.clubs[1]!;
    state.market.offers = [{ id: "o0-1", buyerId: buyer.id, playerId: user(state).players[20]!.id, amount: 700_000 }];
    const sold = acceptOffer(state, "o0-1");
    if (!sold.ok) throw new Error(sold.reason);
    state = sold.state;
    expect(user(state).finance.pendingOut).toBe(price);
    expect(user(state).finance.pendingIn).toBe(700_000);

    user(state).lineup = autoLineup(user(state), AI_FORMATION);
    state = playRound(state).state;
    const l = user(state).finance.lastRound!;
    expect(l.transfersOut).toBe(price);
    expect(l.transfersIn).toBe(700_000);
    expect(clubById(state, seller.id).finance.lastRound!.transfersIn).toBe(price);
    expect(clubById(state, buyer.id).finance.lastRound!.transfersOut).toBe(700_000);
    expect(user(state).finance.pendingIn).toBe(0);
    expect(user(state).finance.pendingOut).toBe(0);

    user(state).lineup = autoLineup(user(state), AI_FORMATION);
    state = playRound(state).state;
    expect(user(state).finance.lastRound!.transfersIn).toBe(0);
    expect(user(state).finance.lastRound!.transfersOut).toBe(0);
  });

  test("mercado do jogo novo não muda a liga", () => {
    for (const seed of [1, 7, 123456]) {
      const rng = createRng(seed);
      const league = generateLeague(rng, "l1", "Campeonato Nacional");
      const state = newGame(seed);
      expect(state.leagues[0], `seed ${seed}`).toEqual(league);
      expect(state.rngState, `seed ${seed}`).toBe(rng.getState());
    }
  });
});

describe("finanças com duas divisões", () => {
  const all = (s: GameState) => s.leagues.flatMap((l) => l.clubs);
  const byId = (s: GameState, id: string) => all(s).find((c) => c.id === id)!;

  /** Cash change of the round as the ledger explains it, plus what the market spent after the close. */
  function explained(before: GameState, after: GameState, id: string): { delta: number; ledger: number } {
    const f = byId(after, id).finance;
    const l = f.lastRound!;
    return {
      delta: f.cash - byId(before, id).finance.cash,
      ledger: l.tickets + l.sponsorship - l.salaries - l.interest + (l.prize ?? 0) - f.pendingOut,
    };
  }

  test("série B recebe 60% do patrocínio", () => {
    const before = game(14);
    const after = playRound(before).state;
    expect(after.leagues[1]!.clubs).toHaveLength(20);
    for (const [division, share] of [[0, 1], [1, 0.6]] as const) {
      for (const c of after.leagues[division]!.clubs) {
        expect(c.finance.lastRound!.sponsorship, c.id).toBe(Math.round(c.finance.sponsorship * share));
        const { delta, ledger } = explained(before, after, c.id);
        expect(delta, c.id).toBe(ledger);
      }
    }
  });

  test("prêmio por posição na rodada 38", () => {
    let state = game(15);
    for (let r = 0; r < 37; r++) state = playRound(state).state;
    for (const c of all(state)) expect(c.finance.lastRound!.prize, `${c.id} rodada 37`).toBeUndefined();
    // Ajustes-4a: the AI's new purchases leave c8 able to expand in round 38; the rule for older
    // tests of gastos-da-ia keeps the works out of this ledger.
    zeroAiSurplus(state);
    const after = playRound(state).state;
    for (const [division, perPlace] of [[0, 250_000], [1, 62_500]] as const) {
      const table = computeTable(after.leagues[division]!);
      expect(table).toHaveLength(20);
      table.forEach((row, i) => {
        const prize = (21 - (i + 1)) * perPlace;
        expect(byId(after, row.clubId).finance.lastRound!.prize, row.clubId).toBe(prize);
        const { delta, ledger } = explained(state, after, row.clubId);
        expect(delta, row.clubId).toBe(ledger);
      });
    }
  }, 60_000);
});

describe("gastos da IA: ampliação (engine)", () => {
  /**
   * A Série A club of 22 players paid R$ 500.000 per round, sponsorship R$ 300.000, tickets at
   * R$ 40, no loan. `fans` 60.000 against capacity 30.000 fills the stadium (form 1 before round 1).
   */
  function stadium(finance: Partial<Club["finance"]>) {
    const s = newGame(81);
    const match = s.leagues[0]!.rounds[0]!.matches[0]!;
    const clubs = s.leagues[0]!.clubs;
    for (const id of [match.homeId, match.awayId]) {
      const c = clubs.find((x) => x.id === id)!;
      c.players.forEach((p, i) => (p.salary = i === 0 ? 500_000 - 21 * 20_000 : 20_000));
      expect(sum(c.players.map((p) => p.salary))).toBe(500_000);
      Object.assign(c.finance, {
        cash: 20_000_000,
        sponsorship: 300_000,
        fans: 60_000,
        capacity: 30_000,
        ticketPrice: 40,
        expansionRoundsLeft: 0,
        loan: 0,
        ...finance,
      });
    }
    const home = clubs.find((x) => x.id === match.homeId)!;
    const away = clubs.find((x) => x.id === match.awayId)!;
    return { clubs, match, home, away };
  }
  const closeWith = (w: ReturnType<typeof stadium>) =>
    closeRoundFinances(w.clubs, [w.match], new Map(w.clubs.map((c) => [c.id, null])), 0, null, null);

  test("IA amplia estádio lotado", () => {
    // Expands: R$ 20.000.000 + 30.000 × 40 + 300.000 − 500.000 = R$ 21.000.000 after closing.
    const w = stadium({});
    closeWith(w);
    expect(w.home.finance.lastRound!.attendance).toBe(30_000);
    expect(w.home.finance.cash).toBe(20_000_000 + 1_200_000 + 300_000 - 500_000 - 4_000_000);
    expect(w.home.finance.expansionRoundsLeft).toBe(6);
    expect(w.home.finance.capacity).toBe(30_000);
    // Exactly 20 payrolls left after the cost also expands: 14.000.000 after closing.
    const edge = stadium({ cash: 14_000_000 - 1_000_000 });
    closeWith(edge);
    expect(edge.home.finance.cash).toBe(10_000_000);
    expect(edge.home.finance.expansionRoundsLeft).toBe(6);

    type Row = [string, Partial<Club["finance"]>, "home" | "away", number, number];
    // [case, finance, side, cash after, rounds left]: the cash moves only by the closing.
    const rows: Row[] = [
      ["fora de casa", {}, "away", 20_000_000 + 300_000 - 500_000, 0],
      ["público 29.999", { fans: 29_999 }, "home", 20_000_000 + 29_999 * 40 + 300_000 - 500_000, 0],
      ["obra em andamento", { expansionRoundsLeft: 3 }, "home", 20_000_000 + 1_200_000 + 300_000 - 500_000, 2],
      ["capacidade 76.000", { fans: 80_000, capacity: 76_000 }, "home", 20_000_000 + 76_000 * 40 + 300_000 - 500_000, 0],
      // After closing: 14.000.000 − 10.000, so cash − 4.000.000 is R$ 10.000 below 20 × 500.000.
      ["R$ 10.000 abaixo da reserva", { cash: 14_000_000 - 10_000 - 1_000_000 }, "home", 14_000_000 - 10_000, 0],
    ];
    expect(rows).toHaveLength(5);
    for (const [what, finance, side, cash, left] of rows) {
      const r = stadium(finance);
      const before = r[side].finance.capacity;
      closeWith(r);
      const f = r[side].finance;
      expect(f.cash, what).toBe(cash);
      expect(f.expansionRoundsLeft, what).toBe(left);
      expect(f.capacity, what).toBe(before);
    }
  });

  test("usuário não amplia sozinho", () => {
    let s = game(82);
    const me = user(s);
    // The first round the user plays at home, and an AI club at home in the same round.
    const round = s.leagues[0]!.rounds.find((r) => r.matches.some((m) => m.homeId === me.id))!;
    const aiHome = round.matches.find((m) => m.homeId !== me.id)!.homeId;
    for (const id of [me.id, aiHome]) {
      Object.assign(clubById(s, id).finance, { cash: 500_000_000, fans: 60_000, capacity: 10_000, ticketPrice: 40, expansionRoundsLeft: 0 });
    }
    while (s.leagues[0]!.currentRound < round.number) {
      user(s).lineup = autoLineup(user(s), AI_FORMATION);
      s = playRound(s).state;
    }
    const mine = user(s).finance;
    expect(mine.lastRound!.attendance).toBe(10_000);
    expect([mine.expansionRoundsLeft, mine.capacity]).toEqual([0, 10_000]);
    // The AI club in the same place does expand.
    const ai = clubById(s, aiHome).finance;
    expect(ai.lastRound!.attendance).toBe(10_000);
    expect(ai.expansionRoundsLeft).toBe(6);
  });
});

describe("dinheiro dos países (paises)", () => {
  test("patrocínio e prêmio dos países novos", () => {
    // C9 (AC 9): a first division abroad is paid like the Série A.
    let s = playRound(newGame(62)).state;
    for (const k of [2, 3]) {
      const club = s.leagues[k]!.clubs[0]!;
      expect(club.finance.lastRound!.sponsorship, club.id).toBe(club.finance.sponsorship);
      expect(club.finance.sponsorship, club.id).toBeGreaterThan(0);
    }
    for (let r = 1; r < 38; r++) s = playRound(s).state;
    for (const k of [2, 3]) {
      const table = computeTable(s.leagues[k]!);
      expect(table, s.leagues[k]!.id).toHaveLength(20);
      table.forEach((row, i) => {
        const club = s.leagues[k]!.clubs.find((c) => c.id === row.clubId)!;
        expect(club.finance.lastRound!.prize, `${club.id} ${i + 1}º`).toBe((21 - (i + 1)) * 250_000);
      });
    }
  }, 60_000);
});
