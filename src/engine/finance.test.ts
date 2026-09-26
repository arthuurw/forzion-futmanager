import {
  attendanceFor,
  capacityFor,
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
import { busySeason } from "./test-fixtures";
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
