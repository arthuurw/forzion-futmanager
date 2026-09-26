import { expandStadium, setTicketPrice, takeLoan, type FinanceResult } from "./finance";
import { newGame } from "./generate";
import { AI_FORMATION, autoLineup } from "./lineup";
import {
  acceptOffer,
  askingPrice,
  buyPlayer,
  isMarketOpen,
  promoteJunior,
  releasePlayer,
  signFreeAgent,
  toggleForSale,
  type MarketResult,
} from "./market";
import { playRound } from "./season";
import type { GameState } from "./types";

const V4_PLAYER_FIELDS = ["contractSeasons", "seasonGames", "seasonGoals", "careerGames", "careerGoals"];

/**
 * A document shaped like a v3 save: one league, no contracts or season numbers, no history and no
 * board goal. The user manages the first club; `roundsPlayed` rounds are in.
 */
export function v3Document(seed = 3, roundsPlayed = 0): Record<string, unknown> {
  let state = newGame(seed);
  const club = state.leagues[0]!.clubs[0]!;
  state.userClubId = club.id;
  club.lineup = autoLineup(club, "4-3-3");
  for (let i = 0; i < roundsPlayed; i++) state = playRound(state).state;
  const doc = JSON.parse(JSON.stringify(state));
  doc.schemaVersion = 3;
  doc.leagues = [doc.leagues[0]];
  delete doc.history;
  delete doc.boardGoal;
  const strip = (p: Record<string, unknown>) => V4_PLAYER_FIELDS.forEach((k) => delete p[k]);
  for (const c of doc.leagues[0].clubs) c.players.forEach(strip);
  doc.market.freeAgents.forEach(strip);
  doc.market.juniors.forEach(strip);
  return doc;
}

/** A document shaped like a v2 save: also no salaries, finances, sale lists or market. */
export function v2Document(seed = 3): Record<string, unknown> {
  const doc = v3Document(seed) as Record<string, unknown> & { leagues: { clubs: Record<string, unknown>[] }[] };
  doc.schemaVersion = 2;
  delete doc.market;
  for (const c of doc.leagues[0]!.clubs) {
    delete c.finance;
    delete c.forSale;
    for (const p of c.players as Record<string, unknown>[]) delete p.salary;
  }
  return doc;
}

/** A document shaped like a v1 save: also no condition on players and no posture on lineups. */
export function v1Document(seed = 3): Record<string, unknown> {
  const doc = v2Document(seed);
  doc.schemaVersion = 1;
  for (const c of (doc.leagues as { clubs: { players: Record<string, unknown>[]; lineup: Record<string, unknown> | null }[] }[])[0]!.clubs) {
    for (const p of c.players) {
      for (const k of ["fitness", "morale", "injuryRounds", "suspendedRounds", "yellowCards", "idleRounds"]) delete p[k];
    }
    if (c.lineup) delete c.lineup.posture;
  }
  return doc;
}

/**
 * A full season where the user touches every kind of money: buys, sells, signs, promotes,
 * releases, borrows and expands the stadium. Used where a check says "every" amount or id.
 */
export function busySeason(seed = 21): GameState {
  let s = newGame(seed);
  const league = () => s.leagues[0]!;
  const me = () => league().clubs.find((c) => c.id === s.userClubId)!;
  s.userClubId = league().clubs[0]!.id;
  me().lineup = autoLineup(me(), AI_FORMATION);
  const apply = (r: MarketResult) => {
    if (!r.ok) throw new Error(`refused: ${r.reason}`);
    s = r.state;
  };
  const money = (r: FinanceResult) => {
    if (!r.ok) throw new Error(`refused: ${r.reason}`);
    me().finance = r.finance;
  };

  const seller = league().clubs[1]!;
  const cheapest = [...seller.players].sort((a, b) => a.rating - b.rating)[0]!;
  apply(buyPlayer(s, cheapest.id, askingPrice(seller, cheapest)));
  apply(signFreeAgent(s, s.market.freeAgents[0]!.id));
  apply(promoteJunior(s, s.market.juniors[0]!.id));
  apply(toggleForSale(s, me().players[3]!.id));
  money(takeLoan(me().finance, 1_000_000));
  money(expandStadium({ ...me().finance }));
  money(setTicketPrice(me().finance, 45));

  for (let round = 0; round < 38; round++) {
    if (isMarketOpen(s)) {
      const offer = s.market.offers[0];
      if (offer && me().players.length > 18) apply(acceptOffer(s, offer.id));
      if (round === 17) {
        const worst = me().players.filter((p) => p.id.startsWith(`${me().id}-`)).sort((a, b) => a.rating - b.rating)[0]!;
        apply(releasePlayer(s, worst.id));
        apply(promoteJunior(s, s.market.juniors[0]!.id));
      }
    }
    me().lineup = autoLineup(me(), AI_FORMATION);
    s = playRound(s).state;
  }
  return s;
}
