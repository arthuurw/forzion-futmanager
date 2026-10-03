import { aiBudget, expandStadium, repayLoan } from "./finance";
import { newGame, makePlayer } from "./generate";
import { AI_FORMATION, aiLineup, autoLineup } from "./lineup";
import {
  acceptOffer,
  askingPrice,
  buyPlayer,
  closeRoundMarket,
  isWindowOpen,
  loanDestination,
  loanFee,
  loanIn,
  loanOut,
  marketValue,
  promoteJunior,
  releasePlayer,
  renewContract,
  signFreeAgent,
  toggleForSale,
} from "./market";
import { createRng, mix32 } from "./rng";
import { playRound } from "./season";
import { busySeason } from "./test-fixtures";
import { POSITIONS, type Club, type GameState, type Player, type Position, type TransferRecord } from "./types";

/** Written out here, not imported (L-004). */
const expectedSalary = (rating: number) => Math.round((2000 * 1.09 ** (rating - 40)) / 100) * 100;
const factor = (age: number) => (age <= 21 ? 1.5 : age <= 27 ? 1.2 : age <= 30 ? 1 : age <= 33 ? 0.6 : 0.3);
const expectedValue = (p: Pick<Player, "salary" | "age">) => Math.round((p.salary * 50 * factor(p.age)) / 10_000) * 10_000;
/** Correcoes-validacao C23: a free agent's sign-on fee, max(4 × salary, 50% of the value), for one whose salary is the table's. */
const expectedFee = (p: Pick<Player, "salary" | "age">) => Math.max(4 * p.salary, Math.round(0.5 * expectedValue(p)));

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
    // Correcoes-validacao C24 (door 3): and the season of arrival.
    expect(arrived).toEqual({ ...before, contractSeasons: 3, arrivedSeason: 1 });
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
  }, 90_000);

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
  }, 90_000);

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
    // Correcoes-validacao C23 (Impact): max(4 × salary, 50% of the value), was 4 × salary.
    expect(user(after).finance.cash).toBe(user(state).finance.cash - expectedFee(agent));
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
    // Correcoes-validacao C23 (Impact): the AI pays the same fee as the user, was 4 × salary.
    const fees = expectedFee(bestFw[0]!) + expectedFee(bestFw[1]!);
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

/** Door 3, written out (L-013): the first `n` draws of the AI purchases' stream of a round. */
function buyDraws(rngState: number, round: number, n: number): number[] {
  const rng = createRng(mix32(mix32(rngState, 0xa1), round));
  return Array.from({ length: n }, () => rng.next());
}
const everyClub = (s: GameState): Club[] => s.leagues.flatMap((l) => l.clubs);
/** The AI clubs in the order the draws go: Série A, then Série B, array order, no user. */
const aiOrder = (s: GameState): Club[] => everyClub(s).filter((c) => c.id !== s.userClubId);
const anyClub = (s: GameState, id: string): Club => everyClub(s).find((c) => c.id === id)!;
const wages = (c: Pick<Club, "players">) => c.players.reduce((sum, p) => sum + p.salary, 0);
const ids = (c: Club) => c.players.map((p) => p.id).sort();
/** Written out (L-004): value by rating and age, not by the stored salary. */
const valueOf = (rating: number, age: number) => Math.round((expectedSalary(rating) * 50 * factor(age)) / 10_000) * 10_000;
/** Written out (L-004): the AC 5 floor, 1,2 × a table salary rounded to R$ 100. */
const raised = (tableSalary: number) => Math.round((1.2 * tableSalary) / 100) * 100;
const byId = (a: string, b: string) => a.localeCompare(b);

interface Quiet {
  s: GameState;
  buyer: Club;
  /** The buyer's weakest starter: a DF rated 60. */
  weakDf: Player;
  rngState: number;
  round: number;
}

/**
 * A world where one club buys: every player and free agent rated 50 and aged 25, every club with
 * no cash (no surplus, not in the red), the user managing the last Série B club. The buyer is the
 * first Série A club the door-3 stream draws below 25%, with R$ 100.000.000; its DFs are 75, 75,
 * 75, 60 (the eleven) and 50, 50, 50, everyone else 75, so its weakest starter is the DF rated 60.
 */
function quiet(seed: number, round = 1): Quiet {
  const s = newGame(seed);
  s.userClubId = s.leagues[1]!.clubs[19]!.id;
  for (const p of [...everyClub(s).flatMap((c) => c.players), ...s.market.freeAgents]) Object.assign(p, { rating: 50, age: 25 });
  for (const c of everyClub(s)) c.finance.cash = 0;
  const draws = buyDraws(s.rngState, round, aiOrder(s).length);
  const k = aiOrder(s).findIndex((_, i) => draws[i]! < 0.25);
  expect(k).toBeGreaterThanOrEqual(0);
  expect(k).toBeLessThan(20);
  const buyer = aiOrder(s)[k]!;
  buyer.players.forEach((p) => (p.rating = 75));
  const dfs = buyer.players.filter((p) => p.position === "DF");
  expect(dfs).toHaveLength(7);
  dfs.forEach((p, i) => (p.rating = i < 3 ? 75 : i === 3 ? 60 : 50));
  buyer.finance.cash = 100_000_000;
  return { s, buyer, weakDf: dfs[3]!, rngState: s.rngState, round };
}

/** A Série A club other than the buyer, cut to `size` players. */
function seller(q: Quiet, size = 22, index = 0): Club {
  const c = q.s.leagues[0]!.clubs.filter((x) => x.id !== q.buyer.id)[index]!;
  c.players = c.players.slice(0, size);
  return c;
}

/** The `nth` player at `position` of a club or list, set to the given rating and age. */
function plant(club: Club | Player[], position: Position, rating: number, age = 25, nth = 0): Player {
  const players = Array.isArray(club) ? club : club.players;
  const p = players.filter((x) => x.position === position)[nth]!;
  Object.assign(p, { rating, age });
  return p;
}

/**
 * The first four players at `position` of `club` become 85 at 33 (they start, and are too old to
 * be bought), so the one planted at `nth` (4 or more) is a reserve.
 */
function reserve(club: Club, position: Position, rating: number, age: number, nth = 4): Player {
  for (let i = 0; i < 4; i++) plant(club, position, 85, 33, i);
  const p = plant(club, position, rating, age, nth);
  expect(aiLineup(club).starters).not.toContain(p.id);
  return p;
}

/** The buyer without its fifth forward (a reserve): 21 players, so a signing releases nobody. */
function cutTo21(q: Quiet): void {
  const fifth = q.buyer.players.filter((p) => p.position === "FW")[4]!;
  q.buyer.players = q.buyer.players.filter((p) => p.id !== fifth.id);
  expect(q.buyer.players).toHaveLength(21);
}

const close = (q: Quiet) => closeRoundMarket(q.s, q.rngState, q.round);
const has = (s: GameState, clubId: string, playerId: string) => anyClub(s, clubId).players.some((p) => p.id === playerId);

/**
 * A world where every AI club has a candidate and a surplus: everyone rated 60 at 25, every AI
 * club with R$ 100.000.000, and every AI club's third goalkeeper rated 90 and suspended in the league
 * (not injured, ajustes-4a AC 5), so he never starts for his own club and is a candidate for everyone
 * else's weakest starter.
 */
function everyoneBuys(seed: number, userAt: [number, number] = [1, 19]): GameState {
  const s = newGame(seed);
  s.userClubId = s.leagues[userAt[0]]!.clubs[userAt[1]]!.id;
  for (const p of everyClub(s).flatMap((c) => c.players)) Object.assign(p, { rating: 60, age: 25 });
  for (const c of aiOrder(s)) {
    c.finance.cash = 100_000_000;
    Object.assign(c.players.filter((p) => p.position === "GK")[2]!, { rating: 90, suspendedRounds: 5 });
  }
  return s;
}

describe("gastos da IA: compras (engine)", () => {
  test("sobra da IA", () => {
    const players = Array.from({ length: 20 }, (_, i) => ({ ...makePlayer(`p${i}`, `P ${i}`, "MF", 25, 60), salary: 25_000 }));
    const club = { players, finance: { ...newGame(1).leagues[0]!.clubs[0]!.finance, cash: 10_000_000 } };
    expect(wages(club)).toBe(500_000);
    expect(aiBudget(club, 50_000)).toBe(10_000_000 - 10 * 550_000);
    expect(aiBudget(club, 50_000)).toBe(4_500_000);
  });

  test("compra no limite da sobra", () => {
    // A reserve DF rated 82 at 25 is worth R$ 4.480.000. He is paid R$ 100.000, above 1,2 × the
    // table (R$ 89.500), so the salary the budget counts is R$ 100.000 either way.
    const run = (cash: number) => {
      const q = quiet(40);
      cutTo21(q);
      q.buyer.players.forEach((p, i) => (p.salary = i === 0 ? 100_000 : 20_000));
      expect(wages(q.buyer)).toBe(500_000);
      q.buyer.finance.cash = cash;
      const target = reserve(seller(q), "DF", 82, 25);
      target.salary = 100_000;
      expect(valueOf(82, 25)).toBe(4_480_000);
      expect(raised(74_600)).toBeLessThan(100_000);
      const before = JSON.stringify(q.buyer);
      close(q);
      return { bought: has(q.s, q.buyer.id, target.id), unchanged: JSON.stringify(anyClub(q.s, q.buyer.id)) === before };
    };
    // Surplus = cash − 10 × (500.000 + 100.000): exactly R$ 4.480.000.
    expect(run(10_480_000)).toEqual({ bought: true, unchanged: false });
    // R$ 10.000 less and no other candidate: no purchase.
    expect(run(10_470_000)).toEqual({ bought: false, unchanged: true });
  });

  test("chance de compra pelo fluxo da door 3", () => {
    // The user in the middle of the Série A, so skipping them shifts the draws of the clubs after.
    const s = everyoneBuys(41, [0, 5]);
    const order = aiOrder(s).map((c) => c.id);
    // Paises (Superseded checks): 79 AI clubs.
    expect(order).toHaveLength(79);
    expect(order).not.toContain(s.userClubId);
    const draws = buyDraws(s.rngState, 2, 79);
    const drawn = order.filter((_, i) => draws[i]! < 0.25);
    expect(drawn.length).toBeGreaterThan(1);
    expect(drawn.length).toBeLessThan(20);
    // The drawn clubs keep 19 players, so none of them is a seller (more than 20) after buying.
    for (const id of drawn) {
      const c = anyClub(s, id);
      c.players = c.players.slice(0, 19);
    }
    const before = new Map(everyClub(s).map((c) => [c.id, new Set(c.players.map((p) => p.id))]));
    closeRoundMarket(s, s.rngState, 2);
    const gained = everyClub(s)
      .filter((c) => c.players.some((p) => !before.get(c.id)!.has(p.id)))
      .map((c) => c.id);
    expect(gained.sort(byId)).toEqual([...drawn].sort(byId));
    for (const id of drawn) expect(anyClub(s, id).players, id).toHaveLength(20);
    // The flat salt rejected by door 3 draws another set (L-014).
    const flat = createRng(mix32(s.rngState, 2 * 16 + 13));
    expect(order.filter(() => flat.next() < 0.25)).not.toEqual(drawn);
  });

  test("compras da IA não mudam os outros sorteios", () => {
    // Everyone rated 60; each AI club has 21 players and a goalkeeper rated 90 suspended in the
    // league (not injured, ajustes-4a AC 5), the only candidates there are. A buyer ends with 22 (no release) and its eleven does not change.
    const variant = (rich: boolean) => {
      const s = game(42);
      for (const p of everyClub(s).flatMap((c) => c.players)) Object.assign(p, { rating: 60, age: 25 });
      const me = user(s);
      me.lineup = autoLineup(me, AI_FORMATION);
      me.forSale = me.players.map((p) => p.id).slice(8);
      for (const c of aiOrder(s)) {
        c.players = c.players.slice(0, 21);
        Object.assign(c.players.filter((p) => p.position === "GK")[2]!, { rating: 90, suspendedRounds: 5 });
        // Without surplus: 5 rounds of payroll, enough to bid for the user's players.
        c.finance.cash = rich ? 100_000_000 : 5 * wages(c);
      }
      return s;
    };
    const rich1 = playRound(variant(true));
    const poor1 = playRound(variant(false));
    expect(rich1.state.market.transfers.filter((t) => t.kind === "buy").length).toBeGreaterThan(0);
    expect(poor1.state.market.transfers).toEqual([]);
    expect(rich1.state.rngState).toBe(poor1.state.rngState);
    const offer = (o: { id: string; playerId: string; amount: number }) => [o.id, o.playerId, o.amount];
    expect(rich1.state.market.offers.length).toBeGreaterThan(0);
    expect(rich1.state.market.offers.map(offer)).toEqual(poor1.state.market.offers.map(offer));
    expect(rich1.state.market.juniors).toEqual(poor1.state.market.juniors);
    // Round 2: every score the same.
    for (const s of [rich1.state, poor1.state]) user(s).lineup = autoLineup(user(s), AI_FORMATION);
    const rich2 = playRound(rich1.state);
    const poor2 = playRound(poor1.state);
    expect(poor2.results).toHaveLength(10);
    expect(rich2.results).toEqual(poor2.results);
    // Closing round 17 (a window opens at 18): the same juniors, with or without purchases.
    const at17 = (rich: boolean) => {
      const s = variant(rich);
      closeRoundMarket(s, 12345, 17);
      return s.market.juniors;
    };
    expect(at17(true)).toHaveLength(3);
    expect(at17(true)).toEqual(at17(false));
  });

  test("compras só em rodada de janela", () => {
    const snapshot = (s: GameState) =>
      JSON.stringify([everyClub(s).map((c) => [c.id, ids(c), c.finance.cash, c.finance.pendingIn, c.finance.pendingOut]), s.market.freeAgents]);
    for (const round of [1, 4, 17, 21]) {
      const s = everyoneBuys(43);
      expect(buyDraws(s.rngState, round, 39).some((d) => d < 0.25), `rodada ${round}`).toBe(true);
      const before = snapshot(s);
      closeRoundMarket(s, s.rngState, round);
      expect(s.market.transfers.filter((t) => t.kind === "buy").length, `rodada ${round}`).toBeGreaterThan(0);
      expect(snapshot(s), `rodada ${round}`).not.toBe(before);
    }
    for (const round of [5, 16, 22, 38]) {
      const s = everyoneBuys(43);
      expect(buyDraws(s.rngState, round, 39).some((d) => d < 0.25), `rodada ${round}`).toBe(true);
      const before = snapshot(s);
      closeRoundMarket(s, s.rngState, round);
      expect(snapshot(s), `rodada ${round}`).toBe(before);
      expect(s.market.transfers, `rodada ${round}`).toEqual([]);
    }
  });

  test("candidatos da compra da IA", () => {
    type Row = [string, (q: Quiet) => { holder: Club | null; player: Player }, boolean];
    const rows: Row[] = [
      [
        "zagueiro reserva 64, 32 anos, vendedor com 21",
        (q) => {
          const c = seller(q, 21);
          return { holder: c, player: reserve(c, "DF", 64, 32) };
        },
        true,
      ],
      [
        "força 63",
        (q) => {
          const c = seller(q, 21);
          return { holder: c, player: reserve(c, "DF", 63, 32) };
        },
        false,
      ],
      [
        "33 anos",
        (q) => {
          const c = seller(q, 21);
          return { holder: c, player: reserve(c, "DF", 64, 33) };
        },
        false,
      ],
      [
        "vendedor com 20",
        (q) => {
          const c = seller(q, 20);
          return { holder: c, player: reserve(c, "DF", 64, 32) };
        },
        false,
      ],
      [
        "titular do vendedor, força 70",
        (q) => {
          const c = seller(q, 21);
          for (let i = 0; i < 3; i++) plant(c, "DF", 85, 33, i);
          const p = plant(c, "DF", 70, 25, 3);
          expect(aiLineup(c).starters).toContain(p.id);
          return { holder: c, player: p };
        },
        false,
      ],
      [
        "do clube do usuário, força 90",
        (q) => {
          const c = anyClub(q.s, q.s.userClubId!);
          for (let i = 0; i < 4; i++) plant(c, "DF", 95, 33, i);
          return { holder: c, player: plant(c, "DF", 90, 25, 4) };
        },
        false,
      ],
      ["livre força 70", (q) => ({ holder: null, player: plant(q.s.market.freeAgents, "DF", 70, 25) }), false],
      [
        "meia força 80",
        (q) => {
          const c = seller(q, 21);
          return { holder: c, player: reserve(c, "MF", 80, 25) };
        },
        false,
      ],
    ];
    expect(rows).toHaveLength(8);
    for (const [what, setup, eligible] of rows) {
      const q = quiet(44);
      const { holder, player } = setup(q);
      const buyerBefore = JSON.stringify(q.buyer);
      close(q);
      expect(has(q.s, q.buyer.id, player.id), what).toBe(eligible);
      if (eligible) continue;
      expect(JSON.stringify(anyClub(q.s, q.buyer.id)), what).toBe(buyerBefore);
      if (holder) expect(has(q.s, holder.id, player.id), what).toBe(true);
      else expect(q.s.market.freeAgents.map((p) => p.id), what).toContain(player.id);
    }
  });

  test("escolha do reforço da IA", () => {
    // Two candidates at the same seller, the 5th and 6th DF: the 6th has the larger id.
    const buy = (a: [number, number], b: [number, number]) => {
      const q = quiet(45);
      cutTo21(q);
      const c = seller(q);
      const first = reserve(c, "DF", a[0], a[1], 4);
      const second = reserve(c, "DF", b[0], b[1], 5);
      expect(byId(first.id, second.id)).toBeLessThan(0);
      const cash = q.buyer.finance.cash;
      close(q);
      const club = anyClub(q.s, q.buyer.id);
      const squad = club.players.map((p) => p.id);
      return { first: squad.includes(first.id), second: squad.includes(second.id), spent: cash - club.finance.cash };
    };
    // Strength first: 66 at 20 (R$ 1.410.000, larger id) beats 64 at 25 (R$ 950.000).
    expect([valueOf(66, 20), valueOf(64, 25)]).toEqual([1_410_000, 950_000]);
    expect(buy([64, 25], [66, 20])).toEqual({ first: false, second: true, spent: 1_410_000 });
    // Price next: at 64, the 25-year-old (R$ 950.000, larger id) beats the 20-year-old (R$ 1.190.000).
    expect(valueOf(64, 20)).toBe(1_190_000);
    expect(buy([64, 20], [64, 25])).toEqual({ first: false, second: true, spent: 950_000 });
    // Id last: same rating and age, the smaller id; the price paid is the reserve's market value.
    expect(buy([64, 25], [64, 25])).toEqual({ first: true, second: false, spent: 950_000 });
  });

  test("compra da IA move jogador e dinheiro", () => {
    const run = (salary: number) => {
      const q = quiet(46);
      cutTo21(q);
      const from = seller(q);
      const target = reserve(from, "DF", 70, 20);
      target.salary = salary;
      const before = JSON.parse(JSON.stringify(target)) as Player;
      close(q);
      return { q, from, target, before };
    };
    // A reserve DF rated 70 at 20 is worth R$ 1.990.000.
    const price = valueOf(70, 20);
    expect(price).toBe(1_990_000);
    const { q, from, target, before } = run(20_000);
    const buyer = anyClub(q.s, q.buyer.id);
    const sold = anyClub(q.s, from.id);
    expect(buyer.finance.cash).toBe(100_000_000 - 1_990_000);
    expect(buyer.finance.pendingOut).toBe(1_990_000);
    expect(sold.finance.cash).toBe(1_990_000);
    expect(sold.finance.pendingIn).toBe(1_990_000);
    expect(sold.players.map((p) => p.id)).not.toContain(target.id);
    // Salary table: salaryFor(70) is R$ 26.500 (the table, written out), so the floor is R$ 31.800.
    expect(raised(26_500)).toBe(31_800);
    const rows: [number, number][] = [
      [20_000, 31_800],
      [40_000, 40_000],
    ];
    for (const [had, gets] of rows) {
      const r = had === 20_000 ? { q, target, before } : run(had);
      const arrived = anyClub(r.q.s, r.q.buyer.id).players.find((p) => p.id === r.target.id);
      expect(arrived, `salário ${had}`).toEqual({ ...r.before, contractSeasons: 3, salary: gets });
    }
  });

  test("dispensa ao passar de 22", () => {
    const q = quiet(47);
    expect(q.buyer.players).toHaveLength(22);
    // The bench DFs are stronger than the DF rated 60 who starts, but injured.
    const bench = q.buyer.players.filter((p) => p.position === "DF" && p.rating === 50);
    bench.forEach((p, i) => Object.assign(p, { rating: 66 + i, injuryRounds: 3 }));
    const released = bench[0]!;
    expect(aiLineup(q.buyer).starters).toContain(q.weakDf.id);
    expect(aiLineup(q.buyer).starters).not.toContain(released.id);
    const target = reserve(seller(q), "DF", 70, 25);
    const price = valueOf(70, 25);
    close(q);
    const buyer = anyClub(q.s, q.buyer.id);
    expect(buyer.players).toHaveLength(22);
    expect(buyer.players.map((p) => p.id)).toContain(target.id);
    expect(buyer.players.map((p) => p.id)).not.toContain(released.id);
    expect(buyer.players.map((p) => p.id)).toContain(q.weakDf.id);
    expect(q.s.market.freeAgents.find((p) => p.id === released.id)!.contractSeasons).toBe(0);
    expect(buyer.finance.cash).toBe(100_000_000 - price - 4 * released.salary);
    expect(buyer.finance.pendingOut).toBe(price + 4 * released.salary);
  });

  test("tentativa sem candidato não muda nada", () => {
    // The best DF on offer is 63, three above the weakest starter.
    const none = quiet(48);
    reserve(seller(none), "DF", 63, 25);
    const before = JSON.stringify(none.buyer);
    close(none);
    expect(JSON.stringify(anyClub(none.s, none.buyer.id))).toBe(before);

    // One candidate, R$ 10.000 above the surplus: R$ 950.000 against R$ 940.000. His salary is
    // above 1,2 × the table (R$ 19.000), so the surplus is the same whichever salary it counts.
    const dear = quiet(48);
    const target = reserve(seller(dear), "DF", 64, 25);
    target.salary = 30_000;
    dear.buyer.finance.cash = 10 * (wages(dear.buyer) + 30_000) + 940_000;
    expect(valueOf(64, 25)).toBe(950_000);
    const snapshot = JSON.stringify(dear.buyer);
    close(dear);
    expect(JSON.stringify(anyClub(dear.s, dear.buyer.id))).toBe(snapshot);
  });

  test("IA nunca compra do usuário", () => {
    let s = game(49);
    const me = user(s);
    // The 5 best of each position in the whole game move to the user's club.
    const pool = [...everyClub(s).flatMap((c) => c.players), ...s.market.freeAgents];
    const best = POSITIONS.flatMap((pos) =>
      pool
        .filter((p) => p.position === pos)
        .sort((a, b) => b.rating - a.rating || a.id.localeCompare(b.id))
        .slice(0, 5),
    );
    const bestIds = new Set(best.map((p) => p.id));
    for (const c of everyClub(s)) c.players = c.players.filter((p) => !bestIds.has(p.id));
    s.market.freeAgents = s.market.freeAgents.filter((p) => !bestIds.has(p.id));
    me.players.push(...best);
    for (const c of aiOrder(s)) c.finance.cash = 500_000_000;
    const mine = ids(me);
    for (let round = 1; round <= 4; round++) {
      user(s).lineup = autoLineup(user(s), AI_FORMATION);
      s = playRound(s).state;
    }
    expect(s.market.transfers.filter((t) => t.kind === "buy").length).toBeGreaterThan(0);
    expect(ids(user(s))).toEqual(mine);
  });
});

/**
 * A world for the sales of S2: everyone rated 50 at 25, no cash anywhere, the user managing the
 * last Série B club. The seller is Série A club `sellerIndex`, R$ 1.000.000 in the red with 20
 * players; its DF rated 80 (a starter, paid R$ 20.000) is the most valuable player of the game.
 */
function redWorld(seed: number, sellerIndex = 0) {
  const s = newGame(seed);
  s.userClubId = s.leagues[1]!.clubs[19]!.id;
  for (const p of [...everyClub(s).flatMap((c) => c.players), ...s.market.freeAgents]) Object.assign(p, { rating: 50, age: 25 });
  for (const c of everyClub(s)) c.finance.cash = 0;
  const from = s.leagues[0]!.clubs[sellerIndex]!;
  from.players = from.players.slice(0, 20);
  from.finance.cash = -1_000_000;
  const star = plant(from, "DF", 80, 25);
  star.salary = 20_000;
  return { s, from, star, price: valueOf(80, 25) };
}
/** salaryFor(80) is R$ 62.800 (the table, written out): the star arrives on R$ 75.400. */
const STAR_SALARY = raised(62_800);
/** Cash that gives `club` exactly `budget` to spend on a player who arrives on `salary` (AC 1, written out). */
const cashFor = (club: Club, budget: number, salary: number) => budget + 10 * (wages(club) + salary);

describe("gastos da IA: venda no vermelho (engine)", () => {
  test("vermelho vende o mais valioso", () => {
    // B is the first Série A club the round-1 stream draws below 25%; C a Série A club it does not draw.
    let seed = 60;
    for (; ; seed++) {
      const draws = buyDraws(redWorld(seed, 19).s.rngState, 1, 39);
      const b = draws.findIndex((d) => d < 0.25);
      if (b >= 0 && b < 18 && draws.slice(b + 1, 18).some((d) => d >= 0.25)) break;
    }
    const { s, from, star, price } = redWorld(seed, 19);
    expect(price).toBe(3_770_000);
    expect(STAR_SALARY).toBe(75_400);
    expect(aiLineup(from).starters).toContain(star.id);
    const draws = buyDraws(s.rngState, 1, 39);
    const bIndex = draws.findIndex((d) => d < 0.25);
    const b = s.leagues[0]!.clubs[bIndex]!;
    const c = s.leagues[0]!.clubs.find((x, i) => i > bIndex && i < 18 && draws[i]! >= 0.25)!;
    const other = s.leagues[0]!.clubs.find((x) => ![b.id, c.id, from.id].includes(x.id))!;
    // B's weakest starter is a GK rated 50; `other` has a reserve GK rated 75 at 20 for R$ 3.060.000.
    // B keeps 20 players, so neither signing makes it release anyone.
    b.players = b.players.slice(0, 20);
    b.players.forEach((p) => (p.rating = p.position === "GK" ? 50 : 75));
    plant(other, "GK", 90, 33, 0);
    const gk = plant(other, "GK", 75, 20, 1);
    expect(aiLineup(other).starters).not.toContain(gk.id);
    gk.salary = 60_000;
    expect(valueOf(75, 20)).toBe(3_060_000);
    b.finance.cash = cashFor(b, 12_000_000, STAR_SALARY);
    c.finance.cash = cashFor(c, 10_000_000, STAR_SALARY);
    // Had B bought the goalkeeper first, its surplus for the star would fall below C's.
    expect(b.finance.cash - 3_060_000 - 10 * (wages(b) + gk.salary + STAR_SALARY)).toBeLessThan(10_000_000);
    const bCash = b.finance.cash;
    closeRoundMarket(s, s.rngState, 1);
    const bAfter = anyClub(s, b.id);
    expect(bAfter.players.find((p) => p.id === star.id)?.salary).toBe(75_400);
    expect(anyClub(s, from.id).finance.cash).toBe(-1_000_000 + 3_770_000);
    expect(anyClub(s, from.id).finance.pendingIn).toBe(3_770_000);
    expect(s.market.transfers.find((t) => t.playerId === star.id)).toMatchObject({ kind: "buy", fromId: from.id, toId: b.id, amount: 3_770_000 });
    // B was drawn too, and bought after the sale.
    expect(has(s, b.id, gk.id)).toBe(true);
    expect(s.market.transfers.map((t) => t.playerId)).toEqual([star.id, gk.id]);
    expect(bCash - bAfter.finance.cash).toBe(3_770_000 + 3_060_000);
  });

  test("comprador da venda do vermelho", () => {
    // Two buyers with the same surplus: the smaller id.
    {
      const { s, star } = redWorld(61);
      const [d, e] = [s.leagues[0]!.clubs[3]!, s.leagues[1]!.clubs[4]!];
      d.finance.cash = cashFor(d, 20_000_000, STAR_SALARY);
      e.finance.cash = cashFor(e, 20_000_000, STAR_SALARY);
      closeRoundMarket(s, s.rngState, 1);
      const [first, second] = [d.id, e.id].sort(byId);
      expect(has(s, first!, star.id)).toBe(true);
      expect(has(s, second!, star.id)).toBe(false);
    }
    // A club with 30 players and the biggest surplus is skipped.
    {
      const { s, star } = redWorld(62);
      const [full, next] = [s.leagues[0]!.clubs[5]!, s.leagues[0]!.clubs[6]!];
      pad(full, 30);
      full.finance.cash = cashFor(full, 50_000_000, STAR_SALARY);
      next.finance.cash = cashFor(next, 20_000_000, STAR_SALARY);
      closeRoundMarket(s, s.rngState, 1);
      expect(has(s, next.id, star.id)).toBe(true);
      expect(anyClub(s, full.id).players).toHaveLength(30);
    }
    // A buyer at 22 releases like C8: the weakest DF off its eleven, not the weaker DF who starts.
    {
      const { s, star } = redWorld(63);
      const buyer = s.leagues[0]!.clubs[7]!;
      expect(buyer.players).toHaveLength(22);
      buyer.players.forEach((p) => (p.rating = 75));
      const dfs = buyer.players.filter((p) => p.position === "DF");
      dfs.forEach((p, i) => Object.assign(p, i < 3 ? { rating: 75 } : i === 3 ? { rating: 60 } : { rating: 62 + i, injuryRounds: 3 }));
      const released = dfs[4]!;
      buyer.finance.cash = cashFor(buyer, 20_000_000, STAR_SALARY);
      const cash = buyer.finance.cash;
      closeRoundMarket(s, s.rngState, 1);
      const after = anyClub(s, buyer.id);
      expect(after.players).toHaveLength(22);
      expect(after.players.map((p) => p.id)).toContain(star.id);
      expect(after.players.map((p) => p.id)).toContain(dfs[3]!.id);
      expect(after.players.map((p) => p.id)).not.toContain(released.id);
      expect(s.market.freeAgents.find((p) => p.id === released.id)!.contractSeasons).toBe(0);
      expect(s.market.transfers.map((t) => t.kind)).toEqual(["buy", "release"]);
      expect(after.finance.cash).toBe(cash - 3_770_000 - 4 * released.salary);
      expect(after.finance.pendingOut).toBe(3_770_000 + 4 * released.salary);
    }
  });

  test("vermelho sem venda", () => {
    // 18 players: no sale, though a rich club could pay.
    {
      const { s, from, star } = redWorld(64);
      from.players = [star, ...from.players.filter((p) => p.id !== star.id)].slice(0, 18);
      const rich = s.leagues[0]!.clubs[9]!;
      rich.finance.cash = cashFor(rich, 50_000_000, STAR_SALARY);
      const before = JSON.stringify(from);
      closeRoundMarket(s, s.rngState, 1);
      expect(JSON.stringify(anyClub(s, from.id))).toBe(before);
      expect(s.market.transfers).toEqual([]);
    }
    // 20 players: the only club with money has R$ 10.000 too little for the value and the new
    // salary, though enough with the salary the star had.
    {
      const { s, from, star, price } = redWorld(65);
      const almost = s.leagues[0]!.clubs[9]!;
      almost.finance.cash = cashFor(almost, price - 10_000, STAR_SALARY);
      expect(almost.finance.cash - 10 * (wages(almost) + star.salary)).toBeGreaterThan(price);
      const before = JSON.stringify(from);
      const buyerBefore = JSON.stringify(almost);
      closeRoundMarket(s, s.rngState, 1);
      expect(JSON.stringify(anyClub(s, from.id))).toBe(before);
      expect(JSON.stringify(anyClub(s, almost.id))).toBe(buyerBefore);
      expect(s.market.transfers).toEqual([]);
    }
  });

  test("vermelho só vende com janela aberta", () => {
    const { s, from } = redWorld(66);
    const rich = s.leagues[0]!.clubs[9]!;
    rich.finance.cash = cashFor(rich, 50_000_000, STAR_SALARY);
    const before = JSON.stringify(from);
    closeRoundMarket(s, s.rngState, 5);
    expect(JSON.stringify(anyClub(s, from.id))).toBe(before);
    expect(s.market.transfers).toEqual([]);
  });
});

describe("gastos da IA: boletim (engine)", () => {
  test("boletim registra cada movimento da IA", () => {
    const rows: [string, () => { got: TransferRecord[]; expected: TransferRecord[] }][] = [
      [
        "compra de clube da IA na rodada 3",
        () => {
          const q = quiet(50, 3);
          cutTo21(q);
          const from = seller(q);
          const p = reserve(from, "DF", 70, 20);
          close(q);
          return { got: q.s.market.transfers, expected: [{ round: 3, kind: "buy", playerId: p.id, playerName: p.name, fromId: from.id, toId: q.buyer.id, amount: 1_990_000 }] };
        },
      ],
      [
        "livre por fillAiSquads",
        () => {
          const s = newGame(51);
          for (const c of everyClub(s)) c.finance.cash = 0;
          const club = s.leagues[0]!.clubs[2]!;
          club.players = club.players.filter((p) => p.position !== "FW");
          expect(club.players).toHaveLength(17);
          const best = s.market.freeAgents.filter((p) => p.position === "FW").sort((a, b) => b.rating - a.rating || a.id.localeCompare(b.id))[0]!;
          closeRoundMarket(s, s.rngState, 3);
          return {
            got: s.market.transfers,
            // Correcoes-validacao C23 (Impact): the new sign-on fee, was 4 × salary.
            expected: [{ round: 3, kind: "free", playerId: best.id, playerName: best.name, fromId: null, toId: club.id, amount: expectedFee(best) }],
          };
        },
      ],
      [
        "dispensa ao passar de 22",
        () => {
          const q = quiet(52, 3);
          const bench = q.buyer.players.filter((p) => p.position === "DF" && p.rating === 50);
          bench.forEach((p, i) => Object.assign(p, { rating: 66 + i, injuryRounds: 3 }));
          const out = bench[0]!;
          const from = seller(q);
          const p = reserve(from, "DF", 70, 20);
          close(q);
          return {
            got: q.s.market.transfers,
            expected: [
              { round: 3, kind: "buy", playerId: p.id, playerName: p.name, fromId: from.id, toId: q.buyer.id, amount: 1_990_000 },
              { round: 3, kind: "release", playerId: out.id, playerName: out.name, fromId: q.buyer.id, toId: null, amount: 4 * out.salary },
            ],
          };
        },
      ],
      [
        "venda do vermelho",
        () => {
          const { s, from, star } = redWorld(53);
          const buyer = s.leagues[0]!.clubs[9]!;
          buyer.players = buyer.players.slice(0, 21);
          buyer.finance.cash = cashFor(buyer, 20_000_000, STAR_SALARY);
          closeRoundMarket(s, s.rngState, 1);
          return {
            got: s.market.transfers,
            expected: [{ round: 1, kind: "buy", playerId: star.id, playerName: star.name, fromId: from.id, toId: buyer.id, amount: 3_770_000 }],
          };
        },
      ],
      [
        "proposta aceita pelo usuário",
        () => {
          const s = game(54);
          for (const l of s.leagues) l.currentRound = 2;
          const me = user(s);
          const sold = me.players[21]!;
          const buyer = clubs(s)[3]!;
          s.market.offers = [{ id: "o2-1", buyerId: buyer.id, playerId: sold.id, amount: 1_230_000 }];
          const after = ok(acceptOffer(s, "o2-1"));
          return {
            got: after.market.transfers,
            expected: [{ round: 2, kind: "buy", playerId: sold.id, playerName: sold.name, fromId: me.id, toId: buyer.id, amount: 1_230_000 }],
          };
        },
      ],
    ];
    expect(rows).toHaveLength(5);
    const kinds = new Set<string>();
    for (const [what, run] of rows) {
      const { got, expected } = run();
      expect(got, what).toEqual(expected);
      for (const t of got) kinds.add(t.kind);
    }
    expect([...kinds].sort()).toEqual(["buy", "free", "release"]);
  });

  test("ações do usuário fora do boletim", () => {
    const base = game(55);
    const earlier: TransferRecord = { round: 1, kind: "free", playerId: "fa-x", playerName: "Alguém", fromId: null, toId: clubs(base)[4]!.id, amount: 40_000 };
    base.market.transfers = [earlier];
    user(base).finance.cash = 100_000_000;
    const from = clubs(base)[6]!;
    const actions: [string, (s: GameState) => { ok: boolean; state?: GameState; reason?: string }][] = [
      ["buyPlayer", (s) => buyPlayer(s, reserveGk(from).id, askingPrice(from, reserveGk(from)))],
      ["releasePlayer", (s) => releasePlayer(s, user(s).players[21]!.id)],
      ["signFreeAgent", (s) => signFreeAgent(s, s.market.freeAgents[0]!.id)],
      ["promoteJunior", (s) => promoteJunior(s, s.market.juniors[0]!.id)],
    ];
    expect(actions).toHaveLength(4);
    for (const [what, act] of actions) {
      const after = ok(act(JSON.parse(JSON.stringify(base)) as GameState));
      expect(after.market.transfers, what).toEqual([earlier]);
    }
  });
});

describe("ajustes-4a: filtros da compra da IA (engine)", () => {
  test("IA não compra lesionado", () => {
    const buy = (injured: number) => {
      const q = quiet(70);
      cutTo21(q);
      const c = seller(q);
      const strong = reserve(c, "DF", 70, 25, 4);
      const next = reserve(c, "DF", 66, 25, 5);
      strong.injuryRounds = injured;
      close(q);
      return { strong: has(q.s, q.buyer.id, strong.id), next: has(q.s, q.buyer.id, next.id) };
    };
    expect(buy(1)).toEqual({ strong: false, next: true });
    expect(buy(0)).toEqual({ strong: true, next: false });
  });

  test("IA não revende quem comprou na temporada", () => {
    type Row = [string, (q: Quiet, holder: Club, p: Player) => TransferRecord | null, boolean];
    const line = (kind: TransferRecord["kind"], p: Player, fromId: string | null, toId: string | null): TransferRecord => ({
      round: 1,
      kind,
      playerId: p.id,
      playerName: p.name,
      fromId,
      toId,
      amount: 500_000,
    });
    const other = (q: Quiet, holder: Club) => q.s.leagues[0]!.clubs.find((c) => c.id !== q.buyer.id && c.id !== holder.id)!;
    const rows: Row[] = [
      ["buy para um clube da IA", (q, holder, p) => line("buy", p, other(q, holder).id, holder.id), false],
      ["buy de proposta aceita", (q, holder, p) => line("buy", p, q.s.userClubId, holder.id), false],
      ["free", (q, holder, p) => line("free", p, null, holder.id), true],
      ["release", (q, holder, p) => line("release", p, other(q, holder).id, null), true],
      ["sem linha", () => null, true],
    ];
    expect(rows).toHaveLength(5);
    for (const [what, make, bought] of rows) {
      const q = quiet(71);
      cutTo21(q);
      const holder = seller(q);
      const p = reserve(holder, "DF", 64, 25);
      const t = make(q, holder, p);
      q.s.market.transfers = t ? [t] : [];
      close(q);
      expect(has(q.s, q.buyer.id, p.id), what).toBe(bought);
      expect(has(q.s, holder.id, p.id), what).toBe(!bought);
    }
  });

  test("venda do vermelho com lesionado e com comprado", () => {
    const run = (setup: (s: GameState, from: Club, star: Player) => void) => {
      const { s, from, star } = redWorld(72);
      const second = plant(from, "MF", 75, 25);
      expect(valueOf(75, 25)).toBeLessThan(valueOf(80, 25));
      const buyer = s.leagues[0]!.clubs[9]!;
      buyer.players = buyer.players.slice(0, 21);
      buyer.finance.cash = cashFor(buyer, 20_000_000, STAR_SALARY);
      setup(s, from, star);
      closeRoundMarket(s, s.rngState, 1);
      return { s, from, buyer, star, second };
    };
    // The most valuable is injured: he is sold all the same.
    {
      const { s, from, buyer, star, second } = run((_, __, star) => (star.injuryRounds = 3));
      expect(has(s, buyer.id, star.id)).toBe(true);
      expect(has(s, from.id, second.id)).toBe(true);
      expect(s.market.transfers.find((t) => t.playerId === star.id)).toMatchObject({ kind: "buy", fromId: from.id, toId: buyer.id, amount: 3_770_000 });
    }
    // The most valuable was bought by an AI club this season: the second most valuable goes.
    {
      const { s, from, buyer, star, second } = run((s, from, star) => {
        const earlier = s.leagues[0]!.clubs[12]!.id;
        s.market.transfers = [{ round: 1, kind: "buy", playerId: star.id, playerName: star.name, fromId: earlier, toId: from.id, amount: 3_000_000 }];
      });
      expect(has(s, from.id, star.id)).toBe(true);
      expect(has(s, buyer.id, second.id)).toBe(true);
      expect(s.market.transfers.filter((t) => t.playerId === second.id)).toEqual([
        { round: 1, kind: "buy", playerId: second.id, playerName: second.name, fromId: from.id, toId: buyer.id, amount: valueOf(75, 25) },
      ]);
    }
  });

  test("sobra da compra usa o salário atual", () => {
    // salaryFor(70) is R$ 26.500 (the table, written out); the AC 5 floor is R$ 31.800.
    expect(expectedSalary(70)).toBe(26_500);
    expect(raised(26_500)).toBe(31_800);
    const price = valueOf(70, 25);
    expect(price).toBe(1_590_000);
    const run = (surplusOverPrice: number) => {
      const q = quiet(73);
      cutTo21(q);
      const target = reserve(seller(q), "DF", 70, 25);
      target.salary = 20_000;
      // Surplus with the current salary: price + surplusOverPrice; with the floor, R$ 118.000 less.
      q.buyer.finance.cash = price + surplusOverPrice + 10 * (wages(q.buyer) + 20_000);
      expect(q.buyer.finance.cash - 10 * (wages(q.buyer) + 31_800)).toBeLessThan(price);
      close(q);
      return has(q.s, q.buyer.id, target.id);
    };
    // C11: price between the surplus with the floor and the surplus with the current salary.
    expect(run(0)).toBe(true);
    // C12: R$ 10.000 above the surplus with the current salary.
    expect(run(-10_000)).toBe(false);
  });
});

describe("mercado com o mundo (paises)", () => {
  test("comprar de clube de outro país", () => {
    // C17 (AC 17): a Série A user buys from the Liga Argentina in the window.
    const s = game(81);
    const seller = s.leagues[2]!.clubs[3]!;
    const player = seller.players[5]!;
    const price = askingPrice(seller, player);
    const me = user(s);
    me.finance.cash = price + 1_000_000;
    const cashBefore = me.finance.cash;
    const sellerBefore = seller.finance.cash;
    const after = ok(buyPlayer(s, player.id, price));
    const mine = after.leagues[0]!.clubs.find((c) => c.id === me.id)!;
    expect(mine.players.find((p) => p.id === player.id)?.contractSeasons).toBe(3);
    expect(mine.finance.cash).toBe(cashBefore - price);
    const sold = after.leagues[2]!.clubs.find((c) => c.id === seller.id)!;
    expect(sold.finance.cash).toBe(sellerBefore + price);
    expect(sold.players.some((p) => p.id === player.id)).toBe(false);
  });

  test("IA negocia só no próprio país", () => {
    // C19 (AC 19, L-007). A purchase: the best candidate plays in Argentina, the second in Brazil.
    const q = quiet(82);
    cutTo21(q);
    const argentine = q.s.leagues[2]!.clubs[0]!;
    const brazilian = seller(q);
    const best = reserve(argentine, "DF", 85, 25);
    const second = reserve(brazilian, "DF", 80, 25);
    close(q);
    expect(has(q.s, q.buyer.id, second.id)).toBe(true);
    expect(has(q.s, q.buyer.id, best.id)).toBe(false);
    expect(has(q.s, argentine.id, best.id)).toBe(true);

    // A sale from the red: the club with the most to spend is Brazilian; the Portuguese one with the most gets it.
    const s = newGame(83);
    s.userClubId = s.leagues[1]!.clubs[19]!.id;
    for (const p of [...everyClub(s).flatMap((c) => c.players), ...s.market.freeAgents]) Object.assign(p, { rating: 50, age: 25 });
    for (const c of everyClub(s)) c.finance.cash = 0;
    const from = s.leagues[3]!.clubs[0]!;
    from.players = from.players.slice(0, 20);
    from.finance.cash = -1_000_000;
    const star = plant(from, "DF", 80, 25);
    star.salary = 20_000;
    const rich = s.leagues[0]!.clubs[2]!;
    const portuguese = s.leagues[3]!.clubs[5]!;
    rich.finance.cash = cashFor(rich, 50_000_000, STAR_SALARY);
    portuguese.finance.cash = cashFor(portuguese, 10_000_000, STAR_SALARY);
    closeRoundMarket(s, s.rngState, 1);
    expect(has(s, portuguese.id, star.id)).toBe(true);
    expect(has(s, rich.id, star.id)).toBe(false);
    expect(s.market.transfers.find((t) => t.playerId === star.id)).toMatchObject({ kind: "buy", fromId: from.id, toId: portuguese.id });
  });

  test("propostas vêm da liga do usuário", () => {
    // C20 (AC 20): a Liga Portuguesa user, everyone for sale, 20 window rounds; clubs abroad are rich (L-007).
    const s = newGame(84);
    const me = s.leagues[3]!.clubs[0]!;
    s.userClubId = me.id;
    me.forSale = me.players.map((p) => p.id);
    for (const l of s.leagues.slice(0, 3)) for (const c of l.clubs) c.finance.cash = 1_000_000_000;
    for (const c of s.leagues[3]!.clubs) if (c.id !== me.id) c.finance.cash = 200_000_000;
    const rounds = [0, 1, 2, 3, 4, 17, 18, 19, 20, 21];
    const buyers: string[] = [];
    let windows = 0;
    for (const pass of [1, 2]) {
      for (const r of rounds) {
        expect(isWindowOpen(r + 1)).toBe(true);
        windows++;
        closeRoundMarket(s, mix32(s.rngState, pass * 100 + r), r);
        buyers.push(...s.market.offers.map((o) => o.buyerId));
      }
    }
    expect(windows).toBe(20);
    expect(buyers.length).toBeGreaterThan(0);
    for (const id of buyers) expect(Number(id.slice(1)), id).toBeGreaterThanOrEqual(61);
    for (const id of buyers) expect(Number(id.slice(1)), id).toBeLessThanOrEqual(80);
  });
});

describe("economia sem dinheiro do nada (correcoes-validacao)", () => {
  test("luvas pelo valor de mercado", () => {
    // C23 (AC 22, L-005): salary 10.000 with a value of 500.000 (54 at 20) and of 60.000 (48 at 35).
    const rows: [number, number, number, number][] = [
      [54, 20, 500_000, 250_000],
      [48, 35, 60_000, 40_000],
    ];
    for (const [rating, age, worth, fee] of rows) {
      expect(valueOf(rating, age), `${rating} aos ${age}`).toBe(worth);
      expect(Math.max(4 * 10_000, Math.round(0.5 * worth)), `${rating} aos ${age}`).toBe(fee);
      const agent = { ...makePlayer("fa-probe", "Probe Livre", "FW", age, rating), salary: 10_000 };

      // The user pays the fee, and releasing the same player costs 4 salaries.
      const s = game(61);
      s.market.freeAgents.push(agent);
      const me = user(s);
      const signed = ok(signFreeAgent(s, agent.id));
      expect(user(signed).finance.cash, `${rating} aos ${age}`).toBe(me.finance.cash - fee);
      const released = ok(releasePlayer(signed, agent.id));
      expect(user(released).finance.cash, `${rating} aos ${age}`).toBe(user(signed).finance.cash - 40_000);

      // An AI club short of forwards signs him and pays the same fee.
      const ai = newGame(62);
      const club = ai.leagues[0]!.clubs[4]!;
      club.players = club.players.filter((p) => p.position !== "FW");
      ai.market.freeAgents = [...ai.market.freeAgents.filter((p) => p.position !== "FW"), agent];
      const cash = club.finance.cash;
      // Round 5 closes the window: the AI only refills its squads, nothing else moves money.
      closeRoundMarket(ai, ai.rngState, 5);
      expect(club.players.map((p) => p.id), `${rating} aos ${age}`).toContain(agent.id);
      expect(ai.market.transfers, `${rating} aos ${age}`).toEqual([
        { round: 5, kind: "free", playerId: agent.id, playerName: agent.name, fromId: null, toId: club.id, amount: fee },
      ]);
      expect(club.finance.cash, `${rating} aos ${age}`).toBe(cash - fee);
    }
  });

  test("chegada registra a temporada", () => {
    // C24 (AC 23, door 3): the three ways in, in season 3.
    const at3 = () => {
      const s = game(63);
      s.season = 3;
      user(s).finance.cash = 50_000_000;
      return s;
    };
    const cases: [string, (s: GameState) => { state: GameState; id: string }][] = [
      ["signFreeAgent", (s) => ({ state: ok(signFreeAgent(s, s.market.freeAgents[0]!.id)), id: s.market.freeAgents[0]!.id })],
      ["promoteJunior", (s) => ({ state: ok(promoteJunior(s, s.market.juniors[0]!.id)), id: s.market.juniors[0]!.id })],
      [
        "buyPlayer",
        (s) => {
          const target = reserveGk(clubs(s)[6]!);
          return { state: ok(buyPlayer(s, target.id, 2 * expectedValue(target))), id: target.id };
        },
      ],
    ];
    for (const [name, act] of cases) {
      const s = at3();
      const { state, id } = act(s);
      expect(user(state).players.find((p) => p.id === id)!.arrivedSeason, name).toBe(3);
    }
    for (const p of user(at3()).players) expect("arrivedSeason" in p, p.id).toBe(false);
  });

  test("trava de revenda na temporada de chegada", () => {
    // C25 (AC 24, door 3, L-007): this season is refused; last season, or no season, is accepted.
    const s = game(64);
    s.season = 2;
    const [now, before, never] = user(s).players;
    now!.arrivedSeason = 2;
    before!.arrivedSeason = 1;
    expect("arrivedSeason" in never!).toBe(false);
    expect(toggleForSale(s, now!.id)).toEqual({ ok: false, reason: "arrived" });
    expect(user(ok(toggleForSale(s, before!.id))).forSale).toEqual([before!.id]);
    expect(user(ok(toggleForSale(s, never!.id))).forSale).toEqual([never!.id]);
  });

  test("sem proposta por quem chegou", () => {
    // C25 (AC 25): the whole squad for sale, the most valuable player arrived this season, 40 seeds.
    let others = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const s = game(seed);
      for (const c of clubs(s)) c.finance.cash = 500_000_000;
      const me = user(s);
      const newcomer = [...me.players].sort((a, b) => expectedValue(b) - expectedValue(a))[0]!;
      newcomer.arrivedSeason = s.season;
      me.forSale = me.players.map((p) => p.id);
      closeRoundMarket(s, mix32(s.rngState, seed), 2);
      expect(s.market.offers.filter((o) => o.playerId === newcomer.id), `seed ${seed}`).toEqual([]);
      others += s.market.offers.length;
    }
    // The others still get bids: the draw did run.
    expect(others).toBeGreaterThan(100);
  });

  test("propostas cabem no comprador", () => {
    // C27 (AC 26): the 12 most valuable for sale, 40 seeds; buyers with little cash or nearly full.
    let multi = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const s = game(seed);
      const me = user(s);
      const top12 = [...me.players].sort((a, b) => expectedValue(b) - expectedValue(a)).slice(0, 12);
      me.forSale = top12.map((p) => p.id);
      const dearest = expectedValue(top12[0]!);
      clubs(s).forEach((c, i) => {
        if (c.id === me.id) return;
        c.finance.cash = Math.round(dearest * (1 + (i % 3)));
        if (i % 4 === 0) pad(c, 29);
      });
      closeRoundMarket(s, mix32(s.rngState, seed), 2);
      const byBuyer = new Map<string, { sum: number; n: number }>();
      for (const o of s.market.offers) {
        const b = byBuyer.get(o.buyerId) ?? { sum: 0, n: 0 };
        byBuyer.set(o.buyerId, { sum: b.sum + o.amount, n: b.n + 1 });
      }
      for (const [id, { sum, n }] of byBuyer) {
        const buyer = clubById(s, id);
        expect(sum, `seed ${seed} ${id}`).toBeLessThanOrEqual(buyer.finance.cash);
        expect(buyer.players.length + n, `seed ${seed} ${id}`).toBeLessThanOrEqual(30);
        if (n > 1) multi++;
      }
    }
    // Some buyers bid for more than one player, so the sums were really tested.
    expect(multi).toBeGreaterThan(0);
  });

  test("comprador desistiu", () => {
    // C28 (AC 27): a buyer whose cash fell under the offer, and a buyer with 30 players.
    const cases: [string, (buyer: Club) => void][] = [
      ["sem caixa", (b) => (b.finance.cash = 799_999)],
      ["com 30", (b) => pad(b, 30)],
    ];
    for (const [name, prepare] of cases) {
      const s = game(65);
      const me = user(s);
      const buyer = clubs(s)[3]!;
      buyer.finance.cash = 50_000_000;
      prepare(buyer);
      s.market.offers = [
        { id: "o1-1", buyerId: buyer.id, playerId: me.players[20]!.id, amount: 800_000 },
        { id: "o1-2", buyerId: clubs(s)[4]!.id, playerId: me.players[19]!.id, amount: 600_000 },
      ];
      const r = acceptOffer(s, "o1-1");
      expect(r.ok, name).toBe(false);
      if (r.ok) continue;
      expect(r.reason, name).toBe("buyer_gone");
      expect(r.state!.market.offers.map((o) => o.id), name).toEqual(["o1-2"]);
      expect(user(r.state!).players.map((p) => p.id), name).toContain(me.players[20]!.id);
      expect(user(r.state!).finance.cash, name).toBe(me.finance.cash);
    }
  });

  test("titular pela força no preço", () => {
    // C29 (AC 28, L-007): a DF rated 74 among the 11 strongest, healthy, injured and tired.
    const s = game(66);
    const seller = clubs(s)[7]!;
    seller.players.forEach((p) => Object.assign(p, { rating: 60, age: 25, injuryRounds: 0, suspendedRounds: 0, fitness: 100 }));
    seller.players.filter((p) => p.position !== "DF").slice(0, 10).forEach((p) => (p.rating = 80));
    const df = seller.players.find((p) => p.position === "DF")!;
    df.rating = 74;
    const outside = seller.players.find((p) => p.rating === 60)!;
    const starterPrice = Math.round(valueOf(74, 25) * 1.5);
    const states: [string, Partial<Player>][] = [
      ["saudável", {}],
      ["lesionado", { injuryRounds: 1 }],
      ["cansado", { fitness: 55 }],
    ];
    for (const [name, change] of states) {
      const copy = JSON.parse(JSON.stringify(seller)) as Club;
      const probe = copy.players.find((p) => p.id === df.id)!;
      Object.assign(probe, change);
      expect(askingPrice(copy, probe), name).toBe(starterPrice);
    }
    expect(askingPrice(seller, outside)).toBe(valueOf(60, 25));
  });
});

describe("oferta inválida (correcoes-validacao)", () => {
  test("oferta inválida não é jogador não encontrado", () => {
    // AC 45: empty (0), zero, negative and decimal amounts are «invalid»; an unknown player stays «not_found».
    const state = game(3);
    const target = reserveGk(clubs(state)[4]!);
    for (const offer of [0, -5, 12.5, Number.NaN]) expect(buyPlayer(state, target.id, offer), String(offer)).toMatchObject({ ok: false, reason: "invalid" });
    expect(buyPlayer(state, "nobody", 100_000)).toMatchObject({ ok: false, reason: "not_found" });
  });
});

/**
 * Emprestimos: everyone rated 50 at 25, the user at the first Série A club, and P, one of the
 * user's reserve midfielders, rated 70 at 20 with 3 seasons left, so P would start for any club
 * of 50s. Market open (next round 1).
 */
function loanWorld(seed = 1) {
  const s = game(seed);
  for (const p of everyClub(s).flatMap((c) => c.players)) Object.assign(p, { rating: 50, age: 25 });
  const me = user(s);
  const p = me.players.filter((x) => x.position === "MF")[4]!;
  Object.assign(p, { rating: 70, age: 20, contractSeasons: 3 });
  me.lineup = autoLineup(me, AI_FORMATION);
  return { s, me, p };
}

const rate = (club: Club, rating: number) => club.players.forEach((x) => (x.rating = rating));
/** The clubs of the user's country (Brasil: Série A and Série B) other than the user's. */
const brAi = (s: GameState) => s.leagues.filter((l) => l.country === "BR").flatMap((l) => l.clubs).filter((c) => c.id !== s.userClubId);
const payroll = (c: Club) => c.players.reduce((sum, x) => sum + x.salary, 0);
const where = (s: GameState, playerId: string) => everyClub(s).find((c) => c.players.some((x) => x.id === playerId));

describe("empréstimo: emprestar (emprestimos)", () => {
  test("emprestar cede o jogador", () => {
    // C1: out of the squad, the lineup, the sale list and the offers; at the destination, starting; no money.
    const { s, me, p } = loanWorld();
    expect(me.lineup!.starters).toContain(p.id);
    me.forSale = [p.id];
    const bidder = clubs(s)[3]!;
    s.market.offers = [{ id: "o1-1", buyerId: bidder.id, playerId: p.id, amount: 500_000 }];
    const money = (c: Club) => ({ cash: c.finance.cash, pendingIn: c.finance.pendingIn, pendingOut: c.finance.pendingOut });
    const mine = money(me);
    const dest = loanDestination(s, p.id)!;
    const theirs = money(anyClub(s, dest));
    const out = ok(loanOut(s, p.id));
    const meAfter = user(out);
    expect(meAfter.players.map((x) => x.id)).not.toContain(p.id);
    expect(meAfter.lineup!.starters).not.toContain(p.id);
    expect(meAfter.forSale).not.toContain(p.id);
    const there = anyClub(out, dest);
    expect(there.players.find((x) => x.id === p.id)).toEqual({ ...p, loanFrom: me.id });
    expect(aiLineup(there).starters).toContain(p.id);
    expect(out.market.offers.map((o) => o.playerId)).not.toContain(p.id);
    expect(money(meAfter)).toEqual(mine);
    expect(money(there)).toEqual(theirs);
  });

  test("destino do empréstimo", () => {
    // C2 (L-005, L-018): door 2, case by case.
    // The strongest club where he would not start is skipped; the next one, where he starts, is picked.
    {
      const { s, p } = loanWorld();
      const [strong, next] = [clubs(s)[3]!, s.leagues[1]!.clubs[7]!];
      rate(strong, 80);
      rate(next, 60);
      expect(aiLineup({ ...strong, players: [...strong.players, p] }).starters).not.toContain(p.id);
      expect(loanDestination(s, p.id), "titular").toBe(next.id);
    }
    // A stronger club with 30 players, where he would start, is skipped.
    {
      const { s, p } = loanWorld();
      const [full, next] = [clubs(s)[2]!, s.leagues[1]!.clubs[7]!];
      pad(full, 30);
      rate(full, 65);
      rate(next, 60);
      expect(loanDestination(s, p.id), "30 jogadores").toBe(next.id);
    }
    // A stronger club of another country, where he would start, is skipped.
    {
      const { s, p } = loanWorld();
      const [abroad, next] = [s.leagues[2]!.clubs[0]!, s.leagues[1]!.clubs[7]!];
      expect(s.leagues[2]!.country).not.toBe("BR");
      rate(abroad, 65);
      rate(next, 60);
      expect(loanDestination(s, p.id), "outro país").toBe(next.id);
    }
    // Two clubs with the same eleven: the smaller id, which is not the first in array order.
    {
      const { s, p } = loanWorld();
      const later = s.leagues[1]!.clubs.find((y) => s.leagues[0]!.clubs.slice(1).some((x) => y.id < x.id))!;
      const earlier = s.leagues[0]!.clubs.slice(1).find((x) => later.id < x.id)!;
      rate(earlier, 60);
      rate(later, 60);
      expect(loanDestination(s, p.id), "empate").toBe(later.id);
    }
    // Nowhere to start: null.
    {
      const { s, p } = loanWorld();
      brAi(s).forEach((c) => rate(c, 80));
      expect(loanDestination(s, p.id), "nenhum").toBeNull();
    }
  });

  test("recusas ao emprestar", () => {
    // C3 (L-005): each refusal changes nothing.
    const cases: [string, (w: ReturnType<typeof loanWorld>) => string, string][] = [
      ["mercado fechado", ({ s, p }) => ((s.leagues[0]!.currentRound = 5), p.id), "closed"],
      ["fora do elenco", () => "nobody", "not_found"],
      ["elenco com 18", ({ me, p }) => ((me.players = [p, ...me.players.filter((x) => x.id !== p.id).slice(0, 17)]), p.id), "user_min"],
      ["último ano", ({ p }) => ((p.contractSeasons = 1), p.id), "last_year"],
      ["sem destino", ({ s, p }) => (brAi(s).forEach((c) => rate(c, 80)), p.id), "no_club"],
      ["emprestado ao usuário", ({ s, p }) => ((p.loanFrom = clubs(s)[4]!.id), p.id), "on_loan"],
    ];
    for (const [name, arrange, reason] of cases) {
      const w = loanWorld();
      const id = arrange(w);
      const before = JSON.stringify(w.s);
      expect(loanOut(w.s, id), name).toEqual({ ok: false, reason });
      expect(JSON.stringify(w.s), name).toBe(before);
    }
  });

  test("salário de quem está emprestado", () => {
    // C4: each club pays the players it fields, on loan or not.
    const { s, me, p } = loanWorld();
    const owner = clubs(s)[5]!;
    const q = owner.players[3]!;
    q.rating = 40;
    const lent = ok(loanOut(s, p.id));
    const both = ok(loanIn(lent, q.id));
    user(both).lineup = autoLineup(user(both), AI_FORMATION);
    const x = where(both, p.id)!;
    expect(x.id).not.toBe(me.id);
    expect(user(both).players.map((y) => y.id)).toContain(q.id);
    const wagesMe = payroll(user(both));
    const wagesX = payroll(x);
    const after = playRound(both).state;
    expect(user(after).finance.lastRound!.salaries).toBe(wagesMe);
    expect(anyClub(after, x.id).finance.lastRound!.salaries).toBe(wagesX);
    expect(wagesX).toBeGreaterThanOrEqual(p.salary);
  });
});

describe("empréstimo: pegar emprestado (emprestimos)", () => {
  /** loanWorld plus Y, a Série A club whose fourth player is rated 40, so he is a reserve. */
  function takeWorld() {
    const w = loanWorld();
    const owner = clubs(w.s)[5]!;
    const q = owner.players[3]!;
    q.rating = 40;
    return { ...w, owner, q };
  }

  test("taxa do empréstimo", () => {
    // C5: 20% of the market value, to R$ 10.000, at least R$ 10.000.
    const cases: [number, number, number, number][] = [
      [65, 20, 1_290_000, 260_000],
      [61, 25, 730_000, 150_000],
      [62, 20, 1_000_000, 200_000],
      [40, 35, 30_000, 10_000],
    ];
    for (const [rating, age, value, fee] of cases) {
      expect(valueOf(rating, age), `${rating}/${age}`).toBe(value);
      expect(loanFee({ rating, age }), `${rating}/${age}`).toBe(fee);
    }
  });

  test("pegar emprestado traz o jogador", () => {
    // C6: the fee moves, the player leaves the owner's saved lineup and joins the user's squad, not the eleven.
    const { s, me, owner, q } = takeWorld();
    owner.lineup = autoLineup(owner, AI_FORMATION);
    owner.lineup.starters[5] = q.id;
    const fee = loanFee(q);
    expect(fee).toBe(20_000);
    const [cash, out, ownerCash, ownerIn] = [me.finance.cash, me.finance.pendingOut, owner.finance.cash, owner.finance.pendingIn];
    const after = ok(loanIn(s, q.id));
    const meAfter = user(after);
    const from = anyClub(after, owner.id);
    expect(meAfter.finance.cash).toBe(cash - fee);
    expect(meAfter.finance.pendingOut).toBe(out + fee);
    expect(from.finance.cash).toBe(ownerCash + fee);
    expect(from.finance.pendingIn).toBe(ownerIn + fee);
    expect(from.players.map((x) => x.id)).not.toContain(q.id);
    expect(from.lineup!.starters).not.toContain(q.id);
    expect(meAfter.players.find((x) => x.id === q.id)).toEqual({ ...q, loanFrom: owner.id });
    expect(meAfter.lineup!.starters).not.toContain(q.id);
  });

  test("recusas ao pegar emprestado", () => {
    // C7 (L-005): each refusal changes nothing.
    const cases: [string, (w: ReturnType<typeof takeWorld>) => string, string][] = [
      ["mercado fechado", ({ s, q }) => ((s.leagues[0]!.currentRound = 5), q.id), "closed"],
      ["não é de clube da IA", ({ p }) => p.id, "not_found"],
      ["titular do dono", ({ owner }) => [...owner.players].sort((a, b) => b.rating - a.rating || a.id.localeCompare(b.id))[0]!.id, "starter"],
      ["emprestado", ({ s, q }) => ((q.loanFrom = clubs(s)[6]!.id), q.id), "on_loan"],
      [
        "29 e 1 emprestado",
        ({ s, me, q }) => {
          pad(me, 29);
          const lent = me.players.find((x) => x.id !== q.id && !me.lineup!.starters.includes(x.id))!;
          me.players = me.players.filter((x) => x.id !== lent.id);
          clubs(s)[9]!.players.push({ ...lent, loanFrom: me.id });
          expect(me.players).toHaveLength(28);
          pad(me, 29);
          return q.id;
        },
        "squad_full",
      ],
      ["dono com 18", ({ owner, q }) => ((owner.players = owner.players.slice(0, 18)), expect(owner.players).toContain(q), q.id), "seller_min"],
      ["caixa", ({ me, q }) => ((me.finance.cash = loanFee(q) - 1), q.id), "cash"],
    ];
    for (const [name, arrange, reason] of cases) {
      const w = takeWorld();
      const id = arrange(w);
      const before = JSON.stringify(w.s);
      expect(loanIn(w.s, id), name).toEqual({ ok: false, reason });
      expect(JSON.stringify(w.s), name).toBe(before);
    }
  });

  /** The user with 29 players, `lent` of them out on loan at another club, and cash for anything. */
  function full(lent: number) {
    const s = game(3);
    const me = user(s);
    me.finance.cash = 1_000_000_000;
    pad(me, 29);
    for (let i = 0; i < lent; i++) {
      const away = me.players.find((x) => !me.lineup!.starters.includes(x.id))!;
      me.players = me.players.filter((x) => x.id !== away.id);
      clubs(s)[9]!.players.push({ ...away, loanFrom: me.id });
    }
    pad(me, 29);
    expect(s.market.freeAgents.length).toBeGreaterThan(0);
    expect(s.market.juniors.length).toBeGreaterThan(0);
    const target = reserveGk(clubs(s)[4]!);
    return {
      buy: () => buyPlayer(s, target.id, 100_000_000),
      sign: () => signFreeAgent(s, s.market.freeAgents[0]!.id),
      promote: () => promoteJunior(s, s.market.juniors[0]!.id),
    };
  }

  test("limite de 30 conta os emprestados", () => {
    // C8: 29 in the squad and 1 out on loan is a full squad.
    const actions = full(1);
    for (const [name, act] of Object.entries(actions)) expect(act(), name).toEqual({ ok: false, reason: "squad_full" });
  });

  test("limite de 30 sem emprestados", () => {
    // C9 (L-030, behaviour that already existed): 29 and nobody out on loan still signs.
    const actions = full(0);
    for (const [name, act] of Object.entries(actions)) expect(act().ok, name).toBe(true);
  });

  test("emprestado não se negocia", () => {
    // C10 (L-005): a player on loan is not for sale, released, renewed or bought.
    const { s, me, owner, q } = takeWorld();
    const mine = user(ok(loanIn(s, q.id)));
    expect(mine.players.map((x) => x.id)).toContain(q.id);
    const withQ = ok(loanIn(s, q.id));
    user(withQ).players.find((x) => x.id === q.id)!.contractSeasons = 1;
    expect(toggleForSale(withQ, q.id), "à venda").toEqual({ ok: false, reason: "on_loan" });
    expect(releasePlayer(withQ, q.id), "dispensa").toEqual({ ok: false, reason: "on_loan" });
    expect(renewContract(withQ, q.id), "renovação").toEqual({ ok: false, reason: "on_loan" });
    // At an AI club, on loan from another AI club: the user cannot buy him.
    const away = clubs(s)[7]!.players[2]!;
    away.loanFrom = owner.id;
    expect(buyPlayer(s, away.id, 100_000_000), "compra").toEqual({ ok: false, reason: "on_loan" });
    expect(me.id).toBe(s.userClubId);
  });
});

describe("empréstimo: a IA respeita (emprestimos)", () => {
  test("IA respeita o empréstimo", () => {
    // C11 (L-005): purchases, sales from the red and releases skip a player on loan.
    // Purchase: in everyoneBuys the third goalkeepers rated 90 are the only candidates; all on loan.
    let bought = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const s = everyoneBuys(seed);
      const loaned = new Set<string>();
      for (const c of aiOrder(s)) {
        const gk = c.players.filter((p) => p.position === "GK")[2]!;
        gk.loanFrom = s.userClubId!;
        loaned.add(gk.id);
      }
      closeRoundMarket(s, s.rngState, 1);
      bought += s.market.transfers.filter((t) => t.kind === "buy" && loaned.has(t.playerId)).length;
    }
    expect(bought, "compra").toBe(0);
    // Sale from the red: the star is on loan, so another player is sold.
    {
      const { s, from, star } = redWorld(61);
      star.loanFrom = s.leagues[0]!.clubs[8]!.id;
      const rich = s.leagues[0]!.clubs[3]!;
      rich.finance.cash = 100_000_000;
      closeRoundMarket(s, s.rngState, 1);
      expect(has(s, from.id, star.id), "venda").toBe(true);
      const sold = s.market.transfers.filter((t) => t.kind === "buy" && t.fromId === from.id);
      expect(sold.length, "venda").toBeGreaterThan(0);
      expect(sold.map((t) => t.playerId), "venda").not.toContain(star.id);
    }
    // Release above 22: the weakest bench DF is on loan, so the next one goes.
    {
      const q = quiet(47);
      const bench = q.buyer.players.filter((p) => p.position === "DF" && p.rating === 50);
      bench.forEach((p, i) => Object.assign(p, { rating: 66 + i, injuryRounds: 3 }));
      bench[0]!.loanFrom = q.s.leagues[0]!.clubs.find((c) => c.id !== q.buyer.id)!.id;
      const target = reserve(seller(q), "DF", 70, 25);
      close(q);
      const buyer = anyClub(q.s, q.buyer.id);
      expect(buyer.players.map((p) => p.id), "dispensa").toContain(target.id);
      expect(buyer.players.map((p) => p.id), "dispensa").toContain(bench[0]!.id);
      expect(buyer.players.map((p) => p.id), "dispensa").not.toContain(bench[1]!.id);
    }
  });

  test("sem proposta por emprestado", () => {
    // C12: the user's 5 most valuable players are on loan to them; offers only for the others.
    let others = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const s = game(seed);
      const me = user(s);
      const top = [...me.players].sort((a, b) => marketValue(b) - marketValue(a)).slice(0, 5);
      for (const p of top) p.loanFrom = clubs(s)[10]!.id;
      const ids = new Set(top.map((p) => p.id));
      closeRoundMarket(s, s.rngState, 1);
      expect(s.market.offers.filter((o) => ids.has(o.playerId)), `semente ${seed}`).toEqual([]);
      others += s.market.offers.length;
    }
    expect(others).toBeGreaterThan(0);
  });
});

describe("compra da IA pela dificuldade (dificuldade)", () => {
  test("chance de compra pela dificuldade", () => {
    // C6 (AC 5, L-005, L-018): the same draws, the level's threshold; the three sets differ.
    const s = everyoneBuys(41, [0, 5]);
    const order = aiOrder(s).map((c) => c.id);
    const draws = buyDraws(s.rngState, 2, order.length);
    const below = (t: number) => order.filter((_, i) => draws[i]! < t).sort(byId);
    const [easy, normal, hard] = [below(0.15), below(0.25), below(0.35)];
    const buyers = (difficulty: GameState["difficulty"]) => {
      const s = everyoneBuys(41, [0, 5]);
      if (difficulty) s.difficulty = difficulty;
      // Every club that could buy at any level keeps 19 players, so no buyer becomes a seller
      // (more than 20); the others stay sellers.
      for (const id of hard) anyClub(s, id).players = anyClub(s, id).players.slice(0, 19);
      const before = new Map(everyClub(s).map((c) => [c.id, new Set(c.players.map((p) => p.id))]));
      closeRoundMarket(s, s.rngState, 2);
      return everyClub(s)
        .filter((c) => c.players.some((p) => !before.get(c.id)!.has(p.id)))
        .map((c) => c.id)
        .sort(byId);
    };
    expect(easy.length).toBeLessThan(normal.length);
    expect(normal.length).toBeLessThan(hard.length);
    expect(buyers("easy"), "Fácil").toEqual(easy);
    expect(buyers("normal"), "Normal").toEqual(normal);
    expect(buyers(undefined), "sem nível").toEqual(normal);
    expect(buyers("hard"), "Difícil").toEqual(hard);
  });
});
