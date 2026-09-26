import { expandStadium, repayLoan } from "./finance";
import { newGame, makePlayer } from "./generate";
import { AI_FORMATION, autoLineup } from "./lineup";
import {
  acceptOffer,
  askingPrice,
  buyPlayer,
  closeRoundMarket,
  isWindowOpen,
  marketValue,
  promoteJunior,
  releasePlayer,
  signFreeAgent,
} from "./market";
import { playRound } from "./season";
import { busySeason } from "./test-fixtures";
import { POSITIONS, type Club, type GameState, type Player } from "./types";

/** Written out here, not imported (L-004). */
const expectedSalary = (rating: number) => Math.round((2000 * 1.09 ** (rating - 40)) / 100) * 100;
const factor = (age: number) => (age <= 21 ? 1.5 : age <= 27 ? 1.2 : age <= 30 ? 1 : age <= 33 ? 0.6 : 0.3);
const expectedValue = (p: Pick<Player, "salary" | "age">) => Math.round((p.salary * 50 * factor(p.age)) / 10_000) * 10_000;

function game(seed = 1): GameState {
  const state = newGame(seed);
  const club = state.leagues[0]!.clubs[0]!;
  state.userClubId = club.id;
  club.lineup = autoLineup(club, AI_FORMATION);
  return state;
}

const clubs = (s: GameState) => s.leagues[0]!.clubs;
const user = (s: GameState): Club => clubs(s).find((c) => c.id === s.userClubId)!;
const clubById = (s: GameState, id: string): Club => clubs(s).find((c) => c.id === id)!;
/** The worst goalkeeper of a club: never among the eleven the AI fields (3 GK, 1 starts). */
const reserveGk = (c: Club) => c.players.filter((p) => p.position === "GK").sort((a, b) => a.rating - b.rating)[0]!;
const bestGk = (c: Club) => c.players.filter((p) => p.position === "GK").sort((a, b) => b.rating - a.rating)[0]!;

function ok(r: { ok: boolean; state?: GameState; reason?: string }): GameState {
  if (!r.ok || !r.state) throw new Error(`refused: ${r.reason}`);
  return r.state;
}

function pad(club: Club, to: number): void {
  while (club.players.length < to) club.players.push(makePlayer(`pad-${club.id}-${club.players.length}`, `Pad ${club.id} ${club.players.length}`, "MF", 25, 50));
}

describe("mercado (engine)", () => {
  test("janelas 1 a 5 e 18 a 22", () => {
    const open = new Set([1, 2, 3, 4, 5, 18, 19, 20, 21, 22]);
    for (let next = 1; next <= 39; next++) expect(isWindowOpen(next), `rodada ${next}`).toBe(open.has(next));
  });

  test("valor pela força e idade", () => {
    // Rating 75 is the rating whose formula salary is R$ 40.800 (superseded C19 of elenco-mercado-financas, now C26).
    const at = (age: number) => marketValue({ rating: 75, age });
    expect(at(20)).toBe(3_060_000);
    expect(at(25)).toBe(2_450_000);
    expect(at(29)).toBe(2_040_000);
    expect(at(32)).toBe(1_220_000);
    expect(at(35)).toBe(610_000);
    // Band edges.
    expect(at(21)).toBe(3_060_000);
    expect(at(22)).toBe(2_450_000);
    expect(at(27)).toBe(2_450_000);
    expect(at(28)).toBe(2_040_000);
    expect(at(30)).toBe(2_040_000);
    expect(at(31)).toBe(1_220_000);
    expect(at(33)).toBe(1_220_000);
    expect(at(34)).toBe(610_000);
    // The stored salary plays no part: a rating-75 player paid R$ 2.000 is worth the same.
    const underpaid = { rating: 75, age: 25, salary: 2_000 };
    expect(marketValue(underpaid)).toBe(2_450_000);
  });

  test("preço pedido titular e reserva", () => {
    const seller = clubs(game(2))[3]!;
    const starter = bestGk(seller);
    const reserve = reserveGk(seller);
    expect(askingPrice(seller, starter)).toBe(expectedValue(starter) * 1.5);
    expect(askingPrice(seller, reserve)).toBe(expectedValue(reserve));
  });

  test("compra com oferta no preço", () => {
    const state = game(3);
    const seller = clubs(state)[4]!;
    const target = reserveGk(seller);
    const price = expectedValue(target);
    const after = ok(buyPlayer(state, target.id, price));
    expect(user(after).players.map((p) => p.id)).toContain(target.id);
    expect(clubById(after, seller.id).players.map((p) => p.id)).not.toContain(target.id);
    expect(user(after).finance.cash).toBe(user(state).finance.cash - price);
    expect(clubById(after, seller.id).finance.cash).toBe(seller.finance.cash + price);
  });

  test("gasto acima do caixa recusado", () => {
    const state = game(4);
    const me = user(state);
    const seller = clubs(state)[5]!;
    const target = reserveGk(seller);
    const agent = state.market.freeAgents[0]!;
    const mine = me.players[21]!;
    const spends: [string, number, () => { ok: boolean; reason?: string }][] = [
      ["compra", expectedValue(target) - 1, () => buyPlayer(state, target.id, expectedValue(target))],
      ["luvas", 4 * agent.salary - 1, () => signFreeAgent(state, agent.id)],
      ["rescisão", 4 * mine.salary - 1, () => releasePlayer(state, mine.id)],
      ["ampliação", 3_999_999, () => expandStadium(me.finance)],
      ["pagamento de empréstimo", 499_999, () => repayLoan({ ...me.finance, loan: 1_000_000 }, 500_000)],
    ];
    expect(spends).toHaveLength(5);
    for (const [what, cash, spend] of spends) {
      me.finance.cash = cash;
      const snapshot = JSON.stringify(state);
      expect(spend(), what).toMatchObject({ ok: false, reason: "cash" });
      expect(JSON.stringify(state), what).toBe(snapshot);
    }
  });

  test("elenco cheio recusa", () => {
    const state = game(5);
    const me = user(state);
    me.finance.cash = 100_000_000;
    pad(me, 30);
    const seller = clubs(state)[6]!;
    expect(buyPlayer(state, reserveGk(seller).id, 50_000_000)).toMatchObject({ ok: false, reason: "squad_full" });
    expect(signFreeAgent(state, state.market.freeAgents[0]!.id)).toMatchObject({ ok: false, reason: "squad_full" });
    expect(promoteJunior(state, state.market.juniors[0]!.id)).toMatchObject({ ok: false, reason: "squad_full" });
  });

  test("vendedor no mínimo recusa", () => {
    const state = game(6);
    user(state).finance.cash = 100_000_000;
    const seller = clubs(state)[7]!;
    const target = reserveGk(seller);
    seller.players = [target, ...seller.players.filter((p) => p.id !== target.id).slice(0, 17)];
    expect(seller.players).toHaveLength(18);
    expect(buyPlayer(state, target.id, 50_000_000)).toMatchObject({ ok: false, reason: "seller_min" });
  });

  test("transferência mantém o jogador", () => {
    const state = game(7);
    const seller = clubs(state)[8]!;
    const target = reserveGk(seller);
    Object.assign(target, { injuryRounds: 2, suspendedRounds: 1, morale: -1, yellowCards: 2, fitness: 70 });
    const before = JSON.parse(JSON.stringify(target)) as Player;
    const after = ok(buyPlayer(state, target.id, expectedValue(target)));
    const arrived = user(after).players.find((p) => p.id === target.id)!;
    // Arrives as they are, with the 3-season contract of a purchase (multiplas-temporadas C29).
    expect(arrived).toEqual({ ...before, contractSeasons: 3 });
    expect(user(after).lineup!.starters).not.toContain(target.id);
  });

  test("propostas por jogador à venda", () => {
    const base = game(8);
    const me = user(base);
    const listed = [...me.players].sort((a, b) => expectedValue(a) - expectedValue(b))[0]!;
    me.forSale = [listed.id];
    const value = expectedValue(listed);
    // Half the AI clubs cannot afford the player: they must never be the buyer.
    const poor = new Set(clubs(base).filter((c) => c.id !== me.id).slice(0, 9).map((c) => c.id));
    for (const c of clubs(base)) if (poor.has(c.id)) c.finance.cash = value / 2;
    // A club with a full squad cannot buy either.
    const full = clubs(base).find((c) => c.id !== me.id && !poor.has(c.id))!;
    pad(full, 30);
    let got = 0;
    const trials = 2000;
    for (let i = 1; i <= trials; i++) {
      const s: GameState = JSON.parse(JSON.stringify(base));
      closeRoundMarket(s, i * 7919, 1);
      for (const o of s.market.offers.filter((x) => x.playerId === listed.id)) {
        got++;
        const buyer = clubById(s, o.buyerId);
        expect(o.amount % 10_000).toBe(0);
        expect(o.amount).toBeGreaterThanOrEqual(Math.round((value * 0.8) / 10_000) * 10_000);
        expect(o.amount).toBeLessThanOrEqual(Math.round((value * 1.1) / 10_000) * 10_000);
        expect(buyer.id).not.toBe(me.id);
        expect(poor.has(buyer.id)).toBe(false);
        expect(buyer.id).not.toBe(full.id);
        expect(buyer.finance.cash).toBeGreaterThanOrEqual(o.amount);
        expect(buyer.players.length).toBeLessThan(30);
      }
    }
    expect(got / trials).toBeGreaterThanOrEqual(0.45);
    expect(got / trials).toBeLessThanOrEqual(0.55);
  });

  test("propostas espontâneas pelos mais valiosos", () => {
    const base = game(9);
    const me = user(base);
    const top5 = new Set([...me.players].sort((a, b) => expectedValue(b) - expectedValue(a)).slice(0, 5).map((p) => p.id));
    let got = 0;
    const trials = 2000;
    for (let i = 1; i <= trials; i++) {
      const s: GameState = JSON.parse(JSON.stringify(base));
      closeRoundMarket(s, i * 7919, 1);
      for (const o of s.market.offers) {
        got++;
        expect(top5.has(o.playerId)).toBe(true);
        const value = expectedValue(me.players.find((p) => p.id === o.playerId)!);
        expect(o.amount % 10_000).toBe(0);
        expect(o.amount).toBeGreaterThanOrEqual(Math.round((value * 1.1) / 10_000) * 10_000);
        expect(o.amount).toBeLessThanOrEqual(Math.round((value * 1.5) / 10_000) * 10_000);
      }
    }
    expect(got / trials).toBeGreaterThanOrEqual(0.2);
    expect(got / trials).toBeLessThanOrEqual(0.3);
  });

  test("usuário no mínimo recusa", () => {
    const state = game(10);
    const me = user(state);
    me.players = me.players.slice(0, 18);
    state.market.offers = [{ id: "o1-1", buyerId: clubs(state)[1]!.id, playerId: me.players[0]!.id, amount: 1_000_000 }];
    expect(acceptOffer(state, "o1-1")).toMatchObject({ ok: false, reason: "user_min" });
    expect(releasePlayer(state, me.players[1]!.id)).toMatchObject({ ok: false, reason: "user_min" });
  });

  test("proposta expira na rodada seguinte", () => {
    let state = game(11);
    // Find a round-1 close that leaves an offer, then play round 2 without answering it.
    user(state).forSale = user(state).players.map((p) => p.id).slice(10);
    state = playRound(state).state;
    const pending = state.market.offers.map((o) => o.id);
    expect(pending.length).toBeGreaterThan(0);
    user(state).lineup = autoLineup(user(state), AI_FORMATION);
    state = playRound(state).state;
    for (const id of pending) expect(state.market.offers.map((o) => o.id)).not.toContain(id);
  });

  test("40 livres no jogo novo", () => {
    const agents = newGame(12).market.freeAgents;
    expect(agents).toHaveLength(40);
    for (const pos of POSITIONS) expect(agents.filter((p) => p.position === pos), pos).toHaveLength(10);
    for (const p of agents) {
      expect(p.rating).toBeGreaterThanOrEqual(45);
      expect(p.rating).toBeLessThanOrEqual(70);
    }
  });

  test("contratar livre paga luvas", () => {
    const state = game(13);
    const agent = state.market.freeAgents[5]!;
    const after = ok(signFreeAgent(state, agent.id));
    expect(user(after).finance.cash).toBe(user(state).finance.cash - 4 * agent.salary);
    expect(user(after).players.map((p) => p.id)).toContain(agent.id);
    expect(after.market.freeAgents.map((p) => p.id)).not.toContain(agent.id);
  });

  test("juniores quando a janela abre", () => {
    const check = (juniors: Player[]) => {
      expect(juniors).toHaveLength(3);
      for (const j of juniors) {
        expect(j.age).toBe(17);
        expect(j.rating).toBeGreaterThanOrEqual(45);
        expect(j.rating).toBeLessThanOrEqual(62);
      }
    };
    let state = game(14);
    check(state.market.juniors);
    for (let round = 1; round <= 17; round++) {
      user(state).lineup = autoLineup(user(state), AI_FORMATION);
      state = playRound(state).state;
      if (round >= 5 && round < 17) expect(state.market.juniors, `depois da rodada ${round}`).toHaveLength(0);
    }
    check(state.market.juniors);
  });

  test("promover júnior sem custo", () => {
    const state = game(15);
    const junior = state.market.juniors[0]!;
    const after = ok(promoteJunior(state, junior.id));
    expect(user(after).finance.cash).toBe(user(state).finance.cash);
    const promoted = user(after).players.find((p) => p.id === junior.id)!;
    expect(promoted.salary).toBe(expectedSalary(junior.rating));
    expect(after.market.juniors.map((p) => p.id)).not.toContain(junior.id);
  });

  test("juniores somem quando a janela fecha", () => {
    let state = game(16);
    for (let round = 1; round <= 22; round++) {
      user(state).lineup = autoLineup(user(state), AI_FORMATION);
      state = playRound(state).state;
      if (round === 4 || round === 21) expect(state.market.juniors, `depois da rodada ${round}`).toHaveLength(3);
      if (round === 5 || round === 22) expect(state.market.juniors, `depois da rodada ${round}`).toHaveLength(0);
    }
  });

  test("IA completa elenco com livres", () => {
    const state = game(17);
    const ai = clubs(state)[9]!;
    // 3 GK, 7 DF, 6 MF, 0 FW = 16: both signings must be forwards, the two best free ones.
    let droppedMf = false;
    ai.players = ai.players.filter((p) => {
      if (p.position === "FW") return false;
      if (p.position === "MF" && !droppedMf) return !(droppedMf = true);
      return true;
    });
    expect(ai.players).toHaveLength(16);
    const bestFw = state.market.freeAgents.filter((p) => p.position === "FW").sort((a, b) => b.rating - a.rating).slice(0, 2);
    const fees = 4 * bestFw[0]!.salary + 4 * bestFw[1]!.salary;
    const after = playRound(state).state;
    const club = clubById(after, ai.id);
    expect(club.players).toHaveLength(18);
    expect(club.players.map((p) => p.id)).toEqual(expect.arrayContaining(bestFw.map((p) => p.id)));
    expect(club.finance.pendingOut).toBe(fees);
    // The fees left the cash on top of the round's own money.
    const l = club.finance.lastRound!;
    expect(club.finance.cash).toBe(ai.finance.cash + l.sponsorship + l.tickets - l.salaries - l.interest - fees);
    for (const p of bestFw) expect(after.market.freeAgents.map((x) => x.id)).not.toContain(p.id);
  });

  test("compra não muda o sorteio das partidas", () => {
    const state = game(18);
    const seller = clubs(state)[10]!;
    const bought = ok(buyPlayer(state, reserveGk(seller).id, expectedValue(reserveGk(seller))));
    const a = playRound(state).state.leagues[0]!.rounds[0]!.matches;
    const b = playRound(bought).state.leagues[0]!.rounds[0]!.matches;
    const involved = new Set([state.userClubId, seller.id]);
    const untouched = a.filter((m) => !involved.has(m.homeId) && !involved.has(m.awayId));
    expect(untouched).toHaveLength(8);
    for (const m of untouched) expect(b.find((x) => x.id === m.id)!.result, m.id).toEqual(m.result);
  });

  test("ids de jogador únicos no save", () => {
    const state = busySeason();
    const squads = state.leagues[0]!.clubs.flatMap((c) => c.players.map((p) => p.id));
    const all = [...squads, ...state.market.freeAgents.map((p) => p.id), ...state.market.juniors.map((p) => p.id)];
    expect(new Set(all).size).toBe(all.length);
    // The season moved players around: free agents joined squads and a released player became free.
    expect(squads.some((id) => id.startsWith("fa-"))).toBe(true);
    expect(squads.some((id) => id.startsWith("jr-"))).toBe(true);
    expect(state.market.freeAgents.some((p) => p.id.startsWith("c"))).toBe(true);
    for (const p of newGame(19).market.freeAgents) expect(p.id).toMatch(/^fa-\d+$/);
    for (const p of newGame(19).market.juniors) expect(p.id).toMatch(/^jr-1-1-\d+$/);
  });
});

describe("mercado com duas divisões e contratos", () => {
  test("compra de clube da outra divisão", () => {
    const state = newGame(16);
    const me = state.leagues[1]!.clubs[0]!;
    state.userClubId = me.id;
    me.lineup = autoLineup(me, AI_FORMATION);
    me.finance.cash = 100_000_000;
    const seller = state.leagues[0]!.clubs[5]!;
    const target = reserveGk(seller);
    const after = ok(buyPlayer(state, target.id, askingPrice(seller, target)));
    expect(after.leagues[1]!.clubs.find((c) => c.id === me.id)!.players.map((p) => p.id)).toContain(target.id);
    expect(after.leagues[0]!.clubs.find((c) => c.id === seller.id)!.players.map((p) => p.id)).not.toContain(target.id);
  });

  test("contrato ao chegar", () => {
    let state = game(17);
    user(state).finance.cash = 100_000_000;
    const seller = clubs(state)[3]!;
    const bought = reserveGk(seller);
    state = ok(buyPlayer(state, bought.id, askingPrice(seller, bought)));
    const free = state.market.freeAgents[0]!;
    state = ok(signFreeAgent(state, free.id));
    const junior = state.market.juniors[0]!;
    state = ok(promoteJunior(state, junior.id));
    const contract = (id: string) => user(state).players.find((p) => p.id === id)!.contractSeasons;
    expect([contract(bought.id), contract(free.id), contract(junior.id)]).toEqual([3, 2, 3]);

    // Sold to the AI: 3 seasons at the new club.
    const sold = user(state).players.find((p) => p.contractSeasons !== 3)!;
    const buyer = clubs(state)[6]!;
    state.market.offers = [{ id: "o-test", buyerId: buyer.id, playerId: sold.id, amount: 1_000_000 }];
    state = ok(acceptOffer(state, "o-test"));
    expect(clubById(state, buyer.id).players.find((p) => p.id === sold.id)!.contractSeasons).toBe(3);
  });
});
