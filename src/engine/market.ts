import { takenNames, generateJuniors } from "./generate";
import { aiBudget, salaryFor } from "./finance";
import { aiLineup, formationSlots } from "./lineup";
import { createRng, mix32, pick, type Rng } from "./rng";
import { allClubs, findAnyClub, findClub, userLeague } from "./season";
import { POSITIONS, type Club, type GameState, type Offer, type Player, type Position, type TransferRecord } from "./types";

export const SQUAD_MIN = 18;
export const SQUAD_MAX = 30;
/** Sign-on fee for a free agent, and the cost of releasing a player: this many rounds of salary. */
export const FEE_ROUNDS = 4;
/** Correcoes-validacao AC 22: a free agent's sign-on fee is at least this share of his market value. */
const SIGNING_VALUE_SHARE = 0.5;
const STARTER_MARKUP = 1.5;
const FOR_SALE_OFFER_CHANCE = 0.5;
const FOR_SALE_OFFER_RANGE = [0.8, 1.1] as const;
const UNSOLICITED_OFFER_CHANCE = 0.25;
const UNSOLICITED_OFFER_RANGE = [1.1, 1.5] as const;
const UNSOLICITED_TARGETS = 5;
/** AC 24, AC 26 (multiplas-temporadas): contract length, in seasons, by how a player arrives. */
export const CONTRACT_BOUGHT = 3;
export const CONTRACT_FREE_AGENT = 2;
export const CONTRACT_JUNIOR = 3;
export const CONTRACT_RENEWAL = 3;
/** Door 3: salts mixed into `rngState` with the round number, next to the 10 match streams. */
const OFFERS_SALT = 14;
const JUNIORS_SALT = 15;
/** Gastos-da-ia AC 2-3, 5-6: calibration of the AI's purchases (plan, Landing note). */
const AI_BUY_CHANCE = 0.25;
const AI_BUY_MIN_GAIN = 4;
const AI_BUY_MAX_AGE = 32;
/** An AI club sells to another AI club only above this many players. */
const AI_SELLER_ABOVE = 20;
const AI_SQUAD_KEEP = 22;
/** A player an AI club buys earns at least this many times the table salary. */
const AI_SALARY_RAISE = 1.2;
/** Gastos-da-ia door 3: the AI purchases' stream is `mix32(mix32(rngState, 0xA1), roundNumber)`. */
const AI_BUY_SALT = 0xa1;
/** Next-round numbers (1-based) when the market is open (AC 16). */
const WINDOWS = [
  { first: 1, last: 5 },
  { first: 18, last: 22 },
] as const;

const roundTo = (n: number, step: number) => Math.round(n / step) * step;

/** AC 16: open while the next round to play is 1-5 or 18-22. */
export function isWindowOpen(nextRound: number): boolean {
  return WINDOWS.some((w) => nextRound >= w.first && nextRound <= w.last);
}

export function nextRoundNumber(state: GameState): number {
  return userLeague(state).currentRound + 1;
}

export function isMarketOpen(state: GameState): boolean {
  return isWindowOpen(nextRoundNumber(state));
}

/** The round the market reopens before, or null when it only reopens next season (AC 17). */
export function nextWindowStart(nextRound: number): number | null {
  return WINDOWS.find((w) => w.first > nextRound)?.first ?? null;
}

/** AC 19. */
export function ageFactor(age: number): number {
  if (age <= 21) return 1.5;
  if (age <= 27) return 1.2;
  if (age <= 30) return 1;
  if (age <= 33) return 0.6;
  return 0.3;
}

/** AC 21 (multiplas-temporadas): never stored; follows the current rating and the age, not the stored salary. */
export function marketValue(p: Pick<Player, "rating" | "age">): number {
  return roundTo(salaryFor(p.rating) * 50 * ageFactor(p.age), 10_000);
}

/** Correcoes-validacao AC 28: the club's 11 highest-rated players, injured, suspended or tired alike; ties by id. */
const strongestEleven = (club: Pick<Club, "players">): Player[] =>
  [...club.players].sort((a, b) => b.rating - a.rating || a.id.localeCompare(b.id)).slice(0, 11);

/** AC 20 (elenco-mercado-financas): one of the club's 11 highest-rated players. */
export function isStarter(club: Club, player: Player): boolean {
  return strongestEleven(club).some((p) => p.id === player.id);
}

/** AC 20: a club asks half as much again for a starter. */
export function askingPrice(club: Club, player: Player): number {
  return isStarter(club, player) ? Math.round(marketValue(player) * STARTER_MARKUP) : marketValue(player);
}

export type MarketRefusal =
  | "closed"
  | "not_found"
  | "price"
  | "cash"
  | "squad_full"
  | "seller_min"
  | "user_min"
  | "not_last_year"
  | "arrived"
  | "buyer_gone"
  | "invalid"
  | "starter"
  | "on_loan"
  | "no_club"
  | "last_year";
/**
 * A refusal may still change the game: `state` is then the game to keep (correcoes-validacao AC
 * 27, an offer whose buyer gave up leaves the list).
 */
export type MarketResult = { ok: true; state: GameState } | { ok: false; reason: MarketRefusal; amount?: number; state?: GameState };

const refuse = (reason: MarketRefusal, amount?: number): MarketResult => (amount === undefined ? { ok: false, reason } : { ok: false, reason, amount });

function clone(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

function userOf(state: GameState): Club {
  if (!state.userClubId) throw new Error("no user club");
  return findClub(userLeague(state), state.userClubId);
}

/** A player joining a club signs for `seasons`. */
function signed(p: Player, seasons: number): Player {
  return { ...p, contractSeasons: seasons };
}

/** Door 3 (correcoes-validacao): a player the user brings in this season. */
function arrived(p: Player, season: number): Player {
  return { ...p, arrivedSeason: season };
}

/** Correcoes-validacao AC 24, AC 25: brought in this season, so not for sale until the next. */
export function arrivedThisSeason(state: Pick<GameState, "season">, p: Pick<Player, "arrivedSeason">): boolean {
  return p.arrivedSeason === state.season;
}

/** Takes a player out of a club: squad, lineup slot, sale list and any offer for them. */
function detach(state: GameState, club: Club, playerId: string): Player {
  const player = club.players.find((p) => p.id === playerId);
  if (!player) throw new Error(`player ${playerId} not in ${club.id}`);
  club.players = club.players.filter((p) => p.id !== playerId);
  if (club.lineup) club.lineup = { ...club.lineup, starters: club.lineup.starters.map((id) => (id === playerId ? null : id)) };
  club.forSale = club.forSale.filter((id) => id !== playerId);
  state.market.offers = state.market.offers.filter((o) => o.playerId !== playerId);
  return player;
}

/** Emprestimos door 1: on loan, so owned by another club than the one it plays for. */
const onLoan = (p: Pick<Player, "loanFrom">) => p.loanFrom !== undefined;

/** Emprestimos AC 22: the players a club has out on loan, with the club each plays for. */
export function loanedOut(state: GameState, clubId: string): { player: Player; club: Club }[] {
  return allClubs(state).flatMap((club) => club.players.filter((p) => p.loanFrom === clubId).map((player) => ({ player, club })));
}

/** Emprestimos AC 14: the user's squad counts the players out on loan, so their return never passes 30. */
function squadFull(state: GameState, user: Club): boolean {
  return user.players.length + loanedOut(state, user.id).length >= SQUAD_MAX;
}

/** AC 21-26: buy a player from an AI club. The player arrives as they are, out of the lineup. */
export function buyPlayer(input: GameState, playerId: string, offer: number): MarketResult {
  if (!isMarketOpen(input)) return refuse("closed");
  const user = userOf(input);
  // AC 6, paises AC 17: any of the other clubs, in any league of any country.
  const seller = allClubs(input).find((c) => c.id !== user.id && c.players.some((p) => p.id === playerId));
  const player = seller?.players.find((p) => p.id === playerId);
  if (!seller || !player) return refuse("not_found");
  // Emprestimos AC 13.
  if (onLoan(player)) return refuse("on_loan");
  // Correcoes-validacao AC 45: a bad amount is not a missing player.
  if (!Number.isInteger(offer) || offer <= 0) return refuse("invalid");
  if (squadFull(input, user)) return refuse("squad_full");
  if (seller.players.length <= SQUAD_MIN) return refuse("seller_min");
  const asking = askingPrice(seller, player);
  if (offer < asking) return refuse("price", asking);
  if (offer > user.finance.cash) return refuse("cash");

  const state = clone(input);
  const buyer = userOf(state);
  const from = findAnyClub(state, seller.id);
  buyer.players.push(arrived(signed(detach(state, from, playerId), CONTRACT_BOUGHT), state.season));
  buyer.finance.cash -= offer;
  buyer.finance.pendingOut += offer;
  from.finance.cash += offer;
  from.finance.pendingIn += offer;
  return { ok: true, state };
}

/** AC 27. Correcoes-validacao AC 24: never one who arrived this season. */
export function toggleForSale(input: GameState, playerId: string): MarketResult {
  if (!isMarketOpen(input)) return refuse("closed");
  const player = userOf(input).players.find((p) => p.id === playerId);
  if (!player) return refuse("not_found");
  // Emprestimos AC 17.
  if (onLoan(player)) return refuse("on_loan");
  if (!userOf(input).forSale.includes(playerId) && arrivedThisSeason(input, player)) return refuse("arrived");
  const state = clone(input);
  const user = userOf(state);
  user.forSale = user.forSale.includes(playerId) ? user.forSale.filter((id) => id !== playerId) : [...user.forSale, playerId];
  return { ok: true, state };
}

/**
 * AC 31, 32. Correcoes-validacao AC 27: a buyer that can no longer pay, or has 30 players, gives
 * up, and the offer leaves the list.
 */
export function acceptOffer(input: GameState, offerId: string): MarketResult {
  if (!isMarketOpen(input)) return refuse("closed");
  const offer = input.market.offers.find((o) => o.id === offerId);
  if (!offer) return refuse("not_found");
  if (userOf(input).players.length <= SQUAD_MIN) return refuse("user_min");
  const buying = findAnyClub(input, offer.buyerId);
  if (buying.finance.cash < offer.amount || buying.players.length >= SQUAD_MAX) {
    const state = clone(input);
    state.market.offers = state.market.offers.filter((o) => o.id !== offerId);
    return { ok: false, reason: "buyer_gone", state };
  }

  const state = clone(input);
  const user = userOf(state);
  const buyer = findAnyClub(state, offer.buyerId);
  const player = detach(state, user, offer.playerId);
  buyer.players.push(signed(player, CONTRACT_BOUGHT));
  // Gastos-da-ia door 2: an AI club paid, so the move goes on the transfer list.
  record(state, userLeague(state).currentRound, "buy", player, user.id, buyer.id, offer.amount);
  user.finance.cash += offer.amount;
  user.finance.pendingIn += offer.amount;
  buyer.finance.cash -= offer.amount;
  buyer.finance.pendingOut += offer.amount;
  return { ok: true, state };
}

export function rejectOffer(input: GameState, offerId: string): MarketResult {
  if (!input.market.offers.some((o) => o.id === offerId)) return refuse("not_found");
  const state = clone(input);
  state.market.offers = state.market.offers.filter((o) => o.id !== offerId);
  return { ok: true, state };
}

export function releaseCost(p: Pick<Player, "salary">): number {
  return FEE_ROUNDS * p.salary;
}

/** Correcoes-validacao AC 22: a free agent's sign-on fee, for the user and the AI. */
export function signingFee(p: Pick<Player, "salary" | "rating" | "age">): number {
  return Math.max(FEE_ROUNDS * p.salary, Math.round(SIGNING_VALUE_SHARE * marketValue(p)));
}

/** AC 34, 32, 23: pays four rounds of salary; the player becomes a free agent. */
export function releasePlayer(input: GameState, playerId: string): MarketResult {
  if (!isMarketOpen(input)) return refuse("closed");
  const player = userOf(input).players.find((p) => p.id === playerId);
  if (!player) return refuse("not_found");
  if (onLoan(player)) return refuse("on_loan");
  if (userOf(input).players.length <= SQUAD_MIN) return refuse("user_min");
  const cost = releaseCost(player);
  if (cost > userOf(input).finance.cash) return refuse("cash");

  const state = clone(input);
  const user = userOf(state);
  state.market.freeAgents.push(signed(detach(state, user, playerId), 0));
  user.finance.cash -= cost;
  user.finance.pendingOut += cost;
  return { ok: true, state };
}

/** AC 36, 24, 23: the sign-on fee is `signingFee` (correcoes-validacao AC 22). */
export function signFreeAgent(input: GameState, playerId: string): MarketResult {
  if (!isMarketOpen(input)) return refuse("closed");
  const player = input.market.freeAgents.find((p) => p.id === playerId);
  if (!player) return refuse("not_found");
  if (squadFull(input, userOf(input))) return refuse("squad_full");
  const fee = signingFee(player);
  if (fee > userOf(input).finance.cash) return refuse("cash");

  const state = clone(input);
  const user = userOf(state);
  state.market.freeAgents = state.market.freeAgents.filter((p) => p.id !== playerId);
  user.players.push(arrived(signed(player, CONTRACT_FREE_AGENT), state.season));
  user.finance.cash -= fee;
  user.finance.pendingOut += fee;
  return { ok: true, state };
}

/** AC 38, 24: free, with the salary set when the junior was generated. */
export function promoteJunior(input: GameState, playerId: string): MarketResult {
  if (!isMarketOpen(input)) return refuse("closed");
  const junior = input.market.juniors.find((p) => p.id === playerId);
  if (!junior) return refuse("not_found");
  if (squadFull(input, userOf(input))) return refuse("squad_full");
  const state = clone(input);
  state.market.juniors = state.market.juniors.filter((p) => p.id !== playerId);
  userOf(state).players.push(arrived(signed(junior, CONTRACT_JUNIOR), state.season));
  return { ok: true, state };
}

/** AC 26: in the last season of the contract, 3 more seasons at the salary of the current rating. */
export function renewalSalary(p: Pick<Player, "rating">): number {
  return salaryFor(p.rating);
}

export function renewContract(input: GameState, playerId: string): MarketResult {
  const player = userOf(input).players.find((p) => p.id === playerId);
  if (!player) return refuse("not_found");
  if (onLoan(player)) return refuse("on_loan");
  if (player.contractSeasons !== 1) return refuse("not_last_year");
  const state = clone(input);
  const user = userOf(state);
  user.players = user.players.map((p) => (p.id === playerId ? { ...p, contractSeasons: CONTRACT_RENEWAL, salary: renewalSalary(p) } : p));
  return { ok: true, state };
}

/** Emprestimos AC 10: what the user pays the owner to take a player on loan until the turn. */
export const LOAN_FEE_SHARE = 0.2;
export const LOAN_FEE_MIN = 10_000;

export function loanFee(p: Pick<Player, "rating" | "age">): number {
  return Math.max(LOAN_FEE_MIN, roundTo(LOAN_FEE_SHARE * marketValue(p), 10_000));
}

/**
 * Emprestimos door 2: the AI club of the user's country, under 30 players, whose AI lineup with the
 * player added fields him; the one with the strongest eleven, ties by id. No draw. Null = none.
 */
export function loanDestination(state: GameState, playerId: string): string | null {
  const user = userOf(state);
  const player = user.players.find((p) => p.id === playerId);
  if (!player) return null;
  const strength = (c: Club) => strongestEleven(c).reduce((sum, p) => sum + p.rating, 0);
  const fits = aiClubs(state).filter(
    (c) =>
      sameCountry(state, c, user) &&
      c.players.length < SQUAD_MAX &&
      aiLineup({ ...c, players: [...c.players, player] }).starters.includes(player.id),
  );
  return fits.sort((a, b) => strength(b) - strength(a) || a.id.localeCompare(b.id))[0]?.id ?? null;
}

export type LoanOutCheck = { ok: true; clubId: string } | { ok: false; reason: MarketRefusal };

/** Emprestimos AC 4-8, AC 17: where the user's player would go, or why not. Changes nothing. */
export function loanOutCheck(state: GameState, playerId: string): LoanOutCheck {
  if (!isMarketOpen(state)) return { ok: false, reason: "closed" };
  const user = userOf(state);
  const player = user.players.find((p) => p.id === playerId);
  if (!player) return { ok: false, reason: "not_found" };
  if (onLoan(player)) return { ok: false, reason: "on_loan" };
  if (user.players.length <= SQUAD_MIN) return { ok: false, reason: "user_min" };
  if (player.contractSeasons === 1) return { ok: false, reason: "last_year" };
  const clubId = loanDestination(state, playerId);
  return clubId ? { ok: true, clubId } : { ok: false, reason: "no_club" };
}

/** Emprestimos AC 3: the player goes to the door-2 club until the turn; no money changes hands. */
export function loanOut(input: GameState, playerId: string): MarketResult {
  const check = loanOutCheck(input, playerId);
  if (!check.ok) return refuse(check.reason);
  const state = clone(input);
  const user = userOf(state);
  const player = detach(state, user, playerId);
  findAnyClub(state, check.clubId).players.push({ ...player, loanFrom: user.id });
  return { ok: true, state };
}

/** Emprestimos AC 10-16: a reserve of an AI club joins the user until the turn, for the loan fee. */
export function loanIn(input: GameState, playerId: string): MarketResult {
  if (!isMarketOpen(input)) return refuse("closed");
  const user = userOf(input);
  const owner = allClubs(input).find((c) => c.id !== user.id && c.players.some((p) => p.id === playerId));
  const player = owner?.players.find((p) => p.id === playerId);
  if (!owner || !player) return refuse("not_found");
  if (onLoan(player)) return refuse("on_loan");
  if (isStarter(owner, player)) return refuse("starter");
  if (squadFull(input, user)) return refuse("squad_full");
  if (owner.players.length <= SQUAD_MIN) return refuse("seller_min");
  const fee = loanFee(player);
  if (fee > user.finance.cash) return refuse("cash");

  const state = clone(input);
  const taker = userOf(state);
  const from = findAnyClub(state, owner.id);
  taker.players.push({ ...detach(state, from, playerId), loanFrom: from.id });
  taker.finance.cash -= fee;
  taker.finance.pendingOut += fee;
  from.finance.cash += fee;
  from.finance.pendingIn += fee;
  return { ok: true, state };
}

/**
 * Emprestimos door 3: every player on loan goes back to the club that owns them, out of the lineup
 * of the club they played for. The first step of the turn. Mutates `state`.
 */
export function endLoans(state: GameState): void {
  for (const club of allClubs(state)) {
    for (const p of club.players.filter(onLoan)) {
      const { loanFrom, ...player } = detach(state, club, p.id);
      const owner = allClubs(state).find((c) => c.id === loanFrom);
      (owner ?? club).players.push(player);
    }
  }
}

function between(rng: Rng, [lo, hi]: readonly [number, number]): number {
  return lo + rng.next() * (hi - lo);
}

/**
 * An AI club able to pay `amount` and with room in its squad, or null (AC 28). Correcoes-validacao
 * AC 26: counting the offers it already made this round.
 */
function pickBuyer(rng: Rng, clubs: readonly Club[], userId: string, amount: number, offers: readonly Offer[]): Club | null {
  const able = clubs.filter((c) => {
    const mine = offers.filter((o) => o.buyerId === c.id);
    const bid = mine.reduce((sum, o) => sum + o.amount, 0);
    return c.id !== userId && c.finance.cash - bid >= amount && c.players.length + mine.length < SQUAD_MAX;
  });
  return able.length ? pick(rng, able) : null;
}

/**
 * AC 28, 29: bids for the user's players, drawn from the round's market stream (door 3).
 * Correcoes-validacao AC 25: never for one who arrived this season.
 */
function generateOffers(state: GameState, rng: Rng, roundNumber: number): Offer[] {
  // Bids come from the user's own division, as before the Série B existed.
  const clubs = userLeague(state).clubs;
  const user = userOf(state);
  const offers: Offer[] = [];
  const add = (player: Player, range: readonly [number, number]) => {
    const amount = roundTo(marketValue(player) * between(rng, range), 10_000);
    const buyer = pickBuyer(rng, clubs, user.id, amount, offers);
    if (buyer && amount > 0) offers.push({ id: `o${roundNumber}-${offers.length + 1}`, buyerId: buyer.id, playerId: player.id, amount });
  };
  for (const player of user.players) {
    if (user.forSale.includes(player.id) && !arrivedThisSeason(state, player) && rng.next() < FOR_SALE_OFFER_CHANCE) add(player, FOR_SALE_OFFER_RANGE);
  }
  if (rng.next() < UNSOLICITED_OFFER_CHANCE) {
    // Emprestimos AC 18: never for a player the user only has on loan.
    const targets = user.players
      .filter((p) => !user.forSale.includes(p.id) && !arrivedThisSeason(state, p) && !onLoan(p))
      .sort((a, b) => marketValue(b) - marketValue(a) || a.id.localeCompare(b.id))
      .slice(0, UNSOLICITED_TARGETS);
    if (targets.length) add(pick(rng, targets), UNSOLICITED_OFFER_RANGE);
  }
  return offers;
}

/** Gastos-da-ia door 1, door 2: appends one line to this season's transfer list. */
function record(
  state: GameState,
  round: number,
  kind: TransferRecord["kind"],
  player: Player,
  fromId: string | null,
  toId: string | null,
  amount: number,
): void {
  state.market.transfers.push({ round, kind, playerId: player.id, playerName: player.name, fromId, toId, amount });
}

/** AC 40: an AI club under 18 signs the best free agent of its thinnest position until it has 18. */
function fillAiSquads(state: GameState, roundNumber: number): void {
  for (const club of allClubs(state)) {
    if (club.id === state.userClubId) continue;
    while (club.players.length < SQUAD_MIN && state.market.freeAgents.length) {
      const count = (pos: string) => club.players.filter((p) => p.position === pos).length;
      const thinnest = [...POSITIONS].sort((a, b) => count(a) - count(b))
        .find((pos) => state.market.freeAgents.some((p) => p.position === pos));
      const best = state.market.freeAgents
        .filter((p) => p.position === thinnest)
        .sort((a, b) => b.rating - a.rating || a.id.localeCompare(b.id))[0];
      if (!best) break;
      state.market.freeAgents = state.market.freeAgents.filter((p) => p.id !== best.id);
      club.players.push(signed(best, CONTRACT_FREE_AGENT));
      const fee = signingFee(best);
      club.finance.cash -= fee;
      club.finance.pendingOut += fee;
      record(state, roundNumber, "free", best, null, club.id, fee);
    }
  }
}

/** The AI clubs, Série A first, in array order; never the user's. */
function aiClubs(state: GameState): Club[] {
  return allClubs(state).filter((c) => c.id !== state.userClubId);
}

/** Paises AC 19: whether two clubs play in leagues of the same country. */
function sameCountry(state: GameState, a: Club, b: Club): boolean {
  const country = (club: Club) => state.leagues.find((l) => l.clubs.includes(club))?.country;
  return country(a) === country(b);
}

const weakestFirst = (a: Player, b: Player) => a.rating - b.rating || a.id.localeCompare(b.id);

/** Ajustes-4a AC 6, AC 7: players an AI club bought this season, read from the transfer list. */
function boughtByAi(state: GameState): Set<string> {
  return new Set(state.market.transfers.filter((t) => t.kind === "buy" && t.toId !== null && t.toId !== state.userClubId).map((t) => t.playerId));
}

/** Gastos-da-ia AC 5: the larger of the current salary and 1,2 × the table salary, to R$ 100. */
function arrivalSalary(p: Player): number {
  return Math.max(p.salary, roundTo(AI_SALARY_RAISE * salaryFor(p.rating), 100));
}

/**
 * Gastos-da-ia AC 5, AC 6: `player` leaves `seller` for `buyer` for `price`, on a 3-season contract
 * and the arrival salary. Above 22 players, the buyer releases the weakest player of that position
 * who was not among its eleven before the move.
 */
function aiSign(state: GameState, roundNumber: number, buyer: Club, player: Player, seller: Club, price: number): void {
  const eleven = new Set(aiLineup(buyer).starters);
  const salary = arrivalSalary(player);
  buyer.players.push({ ...signed(detach(state, seller, player.id), CONTRACT_BOUGHT), salary });
  seller.finance.cash += price;
  seller.finance.pendingIn += price;
  buyer.finance.cash -= price;
  buyer.finance.pendingOut += price;
  record(state, roundNumber, "buy", player, seller.id, buyer.id, price);
  if (buyer.players.length <= AI_SQUAD_KEEP) return;
  const released = buyer.players
    // Emprestimos AC 18: never one on loan.
    .filter((p) => p.position === player.position && p.id !== player.id && !eleven.has(p.id) && !onLoan(p))
    .sort(weakestFirst)[0];
  if (!released) return;
  const cost = releaseCost(released);
  state.market.freeAgents.push(signed(detach(state, buyer, released.id), 0));
  buyer.finance.cash -= cost;
  buyer.finance.pendingOut += cost;
  record(state, roundNumber, "release", released, buyer.id, null, cost);
}

/**
 * Gastos-da-ia AC 9-11: an AI club in the red with more than 18 players sells its most valuable
 * player at market value to the AI club under 30 players with the most to spend on them, ties by id.
 * Ajustes-4a AC 7: injured or not, but never one an AI club bought this season. Paises AC 19: the
 * buyer is a club of the seller's country.
 */
function sellFromTheRed(state: GameState, roundNumber: number): void {
  for (const seller of aiClubs(state)) {
    if (seller.finance.cash >= 0 || seller.players.length <= SQUAD_MIN) continue;
    const bought = boughtByAi(state);
    const player = seller.players
      .filter((p) => !bought.has(p.id) && !onLoan(p))
      .sort((a, b) => marketValue(b) - marketValue(a) || a.id.localeCompare(b.id))[0];
    if (!player) continue;
    const price = marketValue(player);
    const salary = arrivalSalary(player);
    const buyer = aiClubs(state)
      .filter((c) => c.id !== seller.id && sameCountry(state, c, seller) && c.players.length < SQUAD_MAX && aiBudget(c, salary) >= price)
      .sort((a, b) => aiBudget(b, salary) - aiBudget(a, salary) || a.id.localeCompare(b.id))[0];
    if (buyer) aiSign(state, roundNumber, buyer, player, seller, price);
  }
}

interface Candidate {
  player: Player;
  seller: Club;
  price: number;
}

/**
 * Gastos-da-ia AC 3, AC 4, AC 7: the club looks for someone at least 4 better than its weakest
 * starter, for that starter's slot, among the reserves of the AI clubs above 20 players; it buys
 * the strongest it can afford, then the cheapest, then the smallest id. Paises AC 19: only from
 * clubs of its own country.
 */
function tryAiPurchase(state: GameState, roundNumber: number, buyer: Club): void {
  const lineup = aiLineup(buyer);
  const slots = formationSlots(lineup.formation);
  let position: Position | null = null;
  let rating = Infinity;
  for (const [i, id] of lineup.starters.entries()) {
    const p = id ? buyer.players.find((x) => x.id === id) : undefined;
    if (p && p.rating < rating) {
      rating = p.rating;
      position = slots[i]!;
    }
  }
  if (position === null) return;
  // Ajustes-4a AC 5, AC 6: not injured, and not bought by an AI club this season.
  const bought = boughtByAi(state);
  const fits = (p: Player) =>
    p.position === position &&
    p.rating >= rating + AI_BUY_MIN_GAIN &&
    p.age <= AI_BUY_MAX_AGE &&
    p.injuryRounds === 0 &&
    !bought.has(p.id) &&
    // Emprestimos AC 18.
    !onLoan(p);
  const candidates: Candidate[] = aiClubs(state)
    .filter((c) => c.id !== buyer.id && sameCountry(state, c, buyer) && c.players.length > AI_SELLER_ABOVE)
    .flatMap((c) => {
      const eleven = new Set(aiLineup(c).starters);
      // A reserve's asking price is its market value (AC 20 of elenco-mercado-financas).
      return c.players.filter((p) => fits(p) && !eleven.has(p.id)).map((p) => ({ player: p, seller: c, price: marketValue(p) }));
    });
  // The budget counts the salary the player brings; the raise of AC 5 comes with the signing.
  const best = candidates
    .filter((c) => c.price <= aiBudget(buyer, c.player.salary))
    .sort((a, b) => b.player.rating - a.player.rating || a.price - b.price || a.player.id.localeCompare(b.player.id))[0];
  if (best) aiSign(state, roundNumber, buyer, best.player, best.seller, best.price);
}

/** Gastos-da-ia AC 2, door 3: one draw per AI club, in division and club order; below 25% it tries to buy. */
function aiPurchases(state: GameState, rngState: number, roundNumber: number): void {
  const rng = createRng(mix32(mix32(rngState, AI_BUY_SALT), roundNumber));
  for (const club of aiClubs(state)) {
    if (rng.next() < AI_BUY_CHANCE) tryAiPurchase(state, roundNumber, club);
  }
}

/**
 * Closes the market side of a round, after `currentRound` has advanced: old offers expire (AC 33),
 * AI clubs refill (AC 40); while the market stays open, AI clubs in the red sell and then the AI
 * buys (gastos-da-ia S1, S2); juniors appear when a window opens and go when it closes (AC 37,
 * 39), and new offers arrive while the market stays open (AC 28, 29). `rngState` is the one the
 * round was played with. Mutates `state`.
 */
export function closeRoundMarket(state: GameState, rngState: number, roundNumber: number): void {
  state.market.offers = [];
  fillAiSquads(state, roundNumber);
  const next = roundNumber + 1;
  if (isWindowOpen(next)) {
    sellFromTheRed(state, roundNumber);
    aiPurchases(state, rngState, roundNumber);
  }
  const windowIndex = WINDOWS.findIndex((w) => w.first === next);
  if (windowIndex >= 0) {
    const rng = createRng(mix32(rngState, roundNumber * 16 + JUNIORS_SALT));
    state.market.juniors = generateJuniors(rng, takenNames(state), state.season, windowIndex + 1);
  } else if (!isWindowOpen(next)) {
    state.market.juniors = [];
  }
  if (isWindowOpen(next) && state.userClubId) {
    state.market.offers = generateOffers(state, createRng(mix32(rngState, roundNumber * 16 + OFFERS_SALT)), roundNumber);
  }
}
