import { takenNames, generateJuniors } from "./generate";
import { aiLineup } from "./lineup";
import { createRng, mix32, pick, type Rng } from "./rng";
import { findClub, userLeague } from "./season";
import { POSITIONS, type Club, type GameState, type Offer, type Player } from "./types";

export const SQUAD_MIN = 18;
export const SQUAD_MAX = 30;
/** Sign-on fee for a free agent, and the cost of releasing a player: this many rounds of salary. */
export const FEE_ROUNDS = 4;
const STARTER_MARKUP = 1.5;
const FOR_SALE_OFFER_CHANCE = 0.5;
const FOR_SALE_OFFER_RANGE = [0.8, 1.1] as const;
const UNSOLICITED_OFFER_CHANCE = 0.25;
const UNSOLICITED_OFFER_RANGE = [1.1, 1.5] as const;
const UNSOLICITED_TARGETS = 5;
/** Door 3: salts mixed into `rngState` with the round number, next to the 10 match streams. */
const OFFERS_SALT = 14;
const JUNIORS_SALT = 15;
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

/** AC 19: never stored; follows the stored salary and the age. */
export function marketValue(p: Pick<Player, "salary" | "age">): number {
  return roundTo(p.salary * 50 * ageFactor(p.age), 10_000);
}

/** AC 20: a club asks half as much again for one of the eleven it would field. */
export function askingPrice(club: Club, player: Player): number {
  const starter = aiLineup(club).starters.includes(player.id);
  return starter ? Math.round(marketValue(player) * STARTER_MARKUP) : marketValue(player);
}

export type MarketRefusal =
  | "closed"
  | "not_found"
  | "price"
  | "cash"
  | "squad_full"
  | "seller_min"
  | "user_min";
export type MarketResult = { ok: true; state: GameState } | { ok: false; reason: MarketRefusal; amount?: number };

const refuse = (reason: MarketRefusal, amount?: number): MarketResult => (amount === undefined ? { ok: false, reason } : { ok: false, reason, amount });

function clone(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

function userOf(state: GameState): Club {
  if (!state.userClubId) throw new Error("no user club");
  return findClub(userLeague(state), state.userClubId);
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

/** AC 21-26: buy a player from an AI club. The player arrives as they are, out of the lineup. */
export function buyPlayer(input: GameState, playerId: string, offer: number): MarketResult {
  if (!isMarketOpen(input)) return refuse("closed");
  const user = userOf(input);
  const seller = userLeague(input).clubs.find((c) => c.id !== user.id && c.players.some((p) => p.id === playerId));
  const player = seller?.players.find((p) => p.id === playerId);
  if (!seller || !player || !Number.isInteger(offer) || offer <= 0) return refuse("not_found");
  if (user.players.length >= SQUAD_MAX) return refuse("squad_full");
  if (seller.players.length <= SQUAD_MIN) return refuse("seller_min");
  const asking = askingPrice(seller, player);
  if (offer < asking) return refuse("price", asking);
  if (offer > user.finance.cash) return refuse("cash");

  const state = clone(input);
  const buyer = userOf(state);
  const from = findClub(userLeague(state), seller.id);
  buyer.players.push(detach(state, from, playerId));
  buyer.finance.cash -= offer;
  buyer.finance.pendingOut += offer;
  from.finance.cash += offer;
  from.finance.pendingIn += offer;
  return { ok: true, state };
}

/** AC 27. */
export function toggleForSale(input: GameState, playerId: string): MarketResult {
  if (!isMarketOpen(input)) return refuse("closed");
  if (!userOf(input).players.some((p) => p.id === playerId)) return refuse("not_found");
  const state = clone(input);
  const user = userOf(state);
  user.forSale = user.forSale.includes(playerId) ? user.forSale.filter((id) => id !== playerId) : [...user.forSale, playerId];
  return { ok: true, state };
}

/** AC 31, 32. */
export function acceptOffer(input: GameState, offerId: string): MarketResult {
  if (!isMarketOpen(input)) return refuse("closed");
  const offer = input.market.offers.find((o) => o.id === offerId);
  if (!offer) return refuse("not_found");
  if (userOf(input).players.length <= SQUAD_MIN) return refuse("user_min");

  const state = clone(input);
  const user = userOf(state);
  const buyer = findClub(userLeague(state), offer.buyerId);
  buyer.players.push(detach(state, user, offer.playerId));
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

/** AC 34, 32, 23: pays four rounds of salary; the player becomes a free agent. */
export function releasePlayer(input: GameState, playerId: string): MarketResult {
  if (!isMarketOpen(input)) return refuse("closed");
  const player = userOf(input).players.find((p) => p.id === playerId);
  if (!player) return refuse("not_found");
  if (userOf(input).players.length <= SQUAD_MIN) return refuse("user_min");
  const cost = releaseCost(player);
  if (cost > userOf(input).finance.cash) return refuse("cash");

  const state = clone(input);
  const user = userOf(state);
  state.market.freeAgents.push(detach(state, user, playerId));
  user.finance.cash -= cost;
  user.finance.pendingOut += cost;
  return { ok: true, state };
}

/** AC 36, 24, 23: the sign-on fee is four rounds of salary. */
export function signFreeAgent(input: GameState, playerId: string): MarketResult {
  if (!isMarketOpen(input)) return refuse("closed");
  const player = input.market.freeAgents.find((p) => p.id === playerId);
  if (!player) return refuse("not_found");
  if (userOf(input).players.length >= SQUAD_MAX) return refuse("squad_full");
  const fee = releaseCost(player);
  if (fee > userOf(input).finance.cash) return refuse("cash");

  const state = clone(input);
  const user = userOf(state);
  state.market.freeAgents = state.market.freeAgents.filter((p) => p.id !== playerId);
  user.players.push(player);
  user.finance.cash -= fee;
  user.finance.pendingOut += fee;
  return { ok: true, state };
}

/** AC 38, 24: free, with the salary set when the junior was generated. */
export function promoteJunior(input: GameState, playerId: string): MarketResult {
  if (!isMarketOpen(input)) return refuse("closed");
  const junior = input.market.juniors.find((p) => p.id === playerId);
  if (!junior) return refuse("not_found");
  if (userOf(input).players.length >= SQUAD_MAX) return refuse("squad_full");
  const state = clone(input);
  state.market.juniors = state.market.juniors.filter((p) => p.id !== playerId);
  userOf(state).players.push(junior);
  return { ok: true, state };
}

function between(rng: Rng, [lo, hi]: readonly [number, number]): number {
  return lo + rng.next() * (hi - lo);
}

/** An AI club able to pay `amount` and with room in its squad, or null (AC 28). */
function pickBuyer(rng: Rng, clubs: readonly Club[], userId: string, amount: number): Club | null {
  const able = clubs.filter((c) => c.id !== userId && c.finance.cash >= amount && c.players.length < SQUAD_MAX);
  return able.length ? pick(rng, able) : null;
}

/** AC 28, 29: bids for the user's players, drawn from the round's market stream (door 3). */
function generateOffers(state: GameState, rng: Rng, roundNumber: number): Offer[] {
  const league = userLeague(state);
  const user = userOf(state);
  const offers: Offer[] = [];
  const add = (player: Player, range: readonly [number, number]) => {
    const amount = roundTo(marketValue(player) * between(rng, range), 10_000);
    const buyer = pickBuyer(rng, league.clubs, user.id, amount);
    if (buyer && amount > 0) offers.push({ id: `o${roundNumber}-${offers.length + 1}`, buyerId: buyer.id, playerId: player.id, amount });
  };
  for (const player of user.players) {
    if (user.forSale.includes(player.id) && rng.next() < FOR_SALE_OFFER_CHANCE) add(player, FOR_SALE_OFFER_RANGE);
  }
  if (rng.next() < UNSOLICITED_OFFER_CHANCE) {
    const targets = user.players
      .filter((p) => !user.forSale.includes(p.id))
      .sort((a, b) => marketValue(b) - marketValue(a) || a.id.localeCompare(b.id))
      .slice(0, UNSOLICITED_TARGETS);
    if (targets.length) add(pick(rng, targets), UNSOLICITED_OFFER_RANGE);
  }
  return offers;
}

/** AC 40: an AI club under 18 signs the best free agent of its thinnest position until it has 18. */
function fillAiSquads(state: GameState): void {
  for (const club of userLeague(state).clubs) {
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
      club.players.push(best);
      const fee = releaseCost(best);
      club.finance.cash -= fee;
      club.finance.pendingOut += fee;
    }
  }
}

/**
 * Closes the market side of a round, after `currentRound` has advanced: old offers expire (AC 33),
 * AI clubs refill (AC 40), juniors appear when a window opens and go when it closes (AC 37, 39),
 * and new offers arrive while the market stays open (AC 28, 29). `rngState` is the one the
 * round was played with. Mutates `state`.
 */
export function closeRoundMarket(state: GameState, rngState: number, roundNumber: number): void {
  state.market.offers = [];
  fillAiSquads(state);
  const next = roundNumber + 1;
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
