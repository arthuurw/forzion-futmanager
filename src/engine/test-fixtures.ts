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
import { nextDate } from "./calendar";
import { nextSeason } from "./rollover";
import { playDate, playRound } from "./season";
import type { Club, GameState } from "./types";

const V4_PLAYER_FIELDS = ["contractSeasons", "seasonGames", "seasonGoals", "careerGames", "careerGoals"];

/**
 * A document shaped like a v3 save: one league, no contracts or season numbers, no history, no
 * board goal and no cup. The user manages the first club; `roundsPlayed` rounds are in.
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
  delete doc.cups;
  delete doc.cupGoal;
  const strip = (p: Record<string, unknown>) => [...V4_PLAYER_FIELDS, "cupDiscipline"].forEach((k) => delete p[k]);
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

/**
 * A game played date by date until the next date is cup phase `phase`. With `userClubId`, that
 * club is the user's, with an auto-filled lineup before every date.
 */
export function atCupDate(seed: number, phase: number, userClubId: string | null = null): GameState {
  let s = newGame(seed);
  s.userClubId = userClubId;
  for (;;) {
    const date = nextDate(s);
    if (date.kind === "cup" && date.phase === phase) return s;
    if (date.kind === "over") throw new Error("no such cup date");
    const me = s.leagues.flatMap((l) => l.clubs).find((c) => c.id === s.userClubId);
    if (me) me.lineup = autoLineup(me, AI_FORMATION);
    s = playDate(s).state;
  }
}

const best11 = (c: Club) => [...c.players].map((p) => p.rating).sort((a, b) => b - a).slice(0, 11).reduce((a, b) => a + b, 0) / 11;

/**
 * Copa-nacional AC 35, written out (L-004): 1 for a club in the preliminary draw; otherwise by the
 * best-eleven rank among all 40 clubs, ties by id: 1-4 -> 4, 5-8 -> 3, the rest -> 2. -1 without a club.
 */
export function expectedCupGoal(s: GameState): number {
  if (!s.userClubId) return -1;
  const preliminary = s.cups[0]!.phases[0]!.ties.flatMap((t) => [t.homeId, t.awayId]);
  if (preliminary.includes(s.userClubId)) return 1;
  const ranking = s.leagues.flatMap((l) => l.clubs).sort((a, b) => best11(b) - best11(a) || a.id.localeCompare(b.id));
  const rank = ranking.findIndex((c) => c.id === s.userClubId) + 1;
  return rank <= 4 ? 4 : rank <= 8 ? 3 : 2;
}

/**
 * A document shaped like a v4 save (multiplas-temporadas): no cup, no cup goal, no cup discipline
 * and no `cups` on the history. The user manages the first Série A club, `roundsPlayed` rounds in;
 * with `closedSeasons`, that many seasons were played and turned first.
 */
export function v4Document(seed = 3, roundsPlayed = 0, closedSeasons = 0): Record<string, unknown> {
  let state = newGame(seed);
  state.userClubId = state.leagues[0]!.clubs[0]!.id;
  state.boardGoal = 20;
  const me = () => state.leagues.flatMap((l) => l.clubs).find((c) => c.id === state.userClubId)!;
  const play = (rounds: number) => {
    for (let i = 0; i < rounds; i++) {
      me().lineup = autoLineup(me(), AI_FORMATION);
      state = playRound(state).state;
    }
  };
  for (let k = 0; k < closedSeasons; k++) {
    play(38);
    state.boardGoal = 20;
    state = nextSeason(state).state;
  }
  play(roundsPlayed);
  const doc = JSON.parse(JSON.stringify(state));
  doc.schemaVersion = 4;
  delete doc.cups;
  delete doc.cupGoal;
  for (const l of doc.leagues) for (const c of l.clubs) for (const p of c.players) delete p.cupDiscipline;
  for (const p of [...doc.market.freeAgents, ...doc.market.juniors]) delete p.cupDiscipline;
  for (const r of doc.history) delete r.cups;
  return doc;
}
