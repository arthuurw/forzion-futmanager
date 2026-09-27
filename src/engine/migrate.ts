import { userBoardGoal, userCupGoal } from "./board";
import { nextDate } from "./calendar";
import { catchUpPhase, newCup, seedingByStrength } from "./cup";
import { generateFreeAgents, generateSerieB, takenNames } from "./generate";
import { initialFinance, salaryFor } from "./finance";
import { aiLineup, formationSlots, isAvailable } from "./lineup";
import { makeSide, makeMatch, matchSeed, resultOf, runToEnd, type LivePlayer, type LiveRound } from "./live";
import { createRng, mix32, randInt } from "./rng";
import { FRESH_CONDITION, SCHEMA_VERSION, ZERO_STATS, type Club, type GameState, type League, type Player } from "./types";

export type MigrationResult = { kind: "ok"; state: GameState } | { kind: "incompatible"; version: unknown };

interface OldPlayer {
  rating: number;
  [key: string]: unknown;
}
interface OldClub {
  players: OldPlayer[];
  lineup: { [key: string]: unknown } | null;
  [key: string]: unknown;
}
interface OldDocument {
  seed: number;
  leagues: { clubs: OldClub[] }[];
  [key: string]: unknown;
}

/** v1 -> v2 (partida-ao-vivo AC 42): fresh condition on every player, balanced posture on every lineup. */
function v1ToV2(doc: OldDocument): void {
  for (const league of doc.leagues) {
    for (const club of league.clubs) {
      club.players = club.players.map((p) => ({ ...FRESH_CONDITION, ...p }));
      if (club.lineup) club.lineup = { posture: "balanced", ...club.lineup };
    }
  }
}

/**
 * v2 -> v3 (AC 51): salaries by the formula, finances as in a new game, 40 free agents drawn from
 * the seed (door 3: `mix32(seed, 3)`), no offers and no juniors.
 */
function v2ToV3(doc: OldDocument): OldDocument {
  for (const league of doc.leagues) {
    for (const club of league.clubs) {
      club.players = club.players.map((p) => ({ ...p, salary: salaryFor(p.rating) }));
      club.finance = initialFinance(club.players as unknown as Player[]);
      club.forSale = [];
    }
  }
  const leagues = doc.leagues as unknown as League[];
  const freeAgents = generateFreeAgents(createRng(mix32(doc.seed, 3)), takenNames({ leagues }));
  return { ...doc, schemaVersion: 3, market: { freeAgents, juniors: [], offers: [] } };
}

/**
 * The Série B's rounds already played by the Série A, as scores only: no condition, no money and
 * no season numbers (AC 41). Door 5: match `i` of round `n` uses `mix32(mix32(seed, 0xB), n*16 + i)`.
 */
function catchUp(league: League, rounds: number, seed: number): void {
  const players: Record<string, LivePlayer> = {};
  for (const c of league.clubs) for (const p of c.players) players[p.id] = { ...p };
  const clubs = new Map(league.clubs.map((c) => [c.id, c]));
  const side = (club: Club) => {
    const lineup = aiLineup(club);
    const starters = lineup.starters.map((id) => (id && isAvailable(club.players.find((p) => p.id === id)!) ? id : null));
    const bench = club.players.filter((p) => !starters.includes(p.id)).map((p) => p.id);
    return makeSide(club.id, formationSlots(lineup.formation), starters, bench, players, { formation: lineup.formation });
  };
  for (const round of league.rounds.slice(0, rounds)) {
    const live: LiveRound = {
      roundIndex: round.number - 1,
      roundNumber: round.number,
      minute: 0,
      userClubId: null,
      players,
      matches: round.matches.map((m, i) =>
        makeMatch(m.id, side(clubs.get(m.homeId)!), side(clubs.get(m.awayId)!), matchSeed(seed, round.number, i, 1), league.id),
      ),
    };
    runToEnd(live).matches.forEach((lm, i) => (round.matches[i]!.result = resultOf(lm)));
  }
  league.currentRound = rounds;
}

/**
 * v3 -> v4 (AC 41): the Série B from the seed with the rounds already played, contracts of 1 to 4
 * seasons for the Série A (door 5: `mix32(seed, 5)`), zeroed numbers, empty history, the board goal.
 */
function v3ToV4(doc: OldDocument): GameState {
  const state = doc as unknown as GameState;
  const contracts = createRng(mix32(state.seed, 5));
  const withStats = (p: Player, contractSeasons: number): Player => ({ ...p, ...ZERO_STATS, contractSeasons });
  const serieA = state.leagues[0]!;
  for (const club of serieA.clubs) club.players = club.players.map((p) => withStats(p, randInt(contracts, 1, 4)));
  state.market = {
    ...state.market,
    freeAgents: state.market.freeAgents.map((p) => withStats(p, 0)),
    juniors: state.market.juniors.map((p) => withStats(p, 0)),
  };
  const serieB = generateSerieB(state.seed, takenNames(state));
  catchUp(serieB, serieA.currentRound, state.seed);
  const migrated = { ...state, schemaVersion: 4, leagues: [serieA, serieB], history: [], boardGoal: 0 } as unknown as GameState;
  migrated.boardGoal = userBoardGoal(migrated);
  return migrated;
}

/** Door 5 (copa-nacional): the draws' state and the matches' state of a migrated cup. */
const CUP_DRAW_SALT = 6;
const CUP_MATCH_SALT = 7;

/**
 * v4 -> v5 (copa-nacional AC 51, 52, door 5): an empty cup discipline on every player, `cups: []`
 * on every closed season, and this season's cup seeded by strength. The phases the calendar has
 * already passed are drawn and played with scores only - no money, no condition.
 */
function v4ToV5(doc: GameState): GameState {
  const state = doc;
  const players = [...state.leagues.flatMap((l) => l.clubs.flatMap((c) => c.players)), ...state.market.freeAgents, ...state.market.juniors];
  for (const p of players) p.cupDiscipline = {};
  state.history = state.history.map((r) => ({ ...r, cups: [] }));
  const drawState = mix32(state.seed, CUP_DRAW_SALT);
  const matchState = mix32(state.seed, CUP_MATCH_SALT);
  state.cups = [newCup(seedingByStrength(state.leagues), drawState)];
  while (nextDate(state).kind === "cup") catchUpPhase(state, 0, matchState, drawState);
  (state as { schemaVersion: number }).schemaVersion = 5;
  state.cupGoal = userCupGoal(state);
  return state;
}

/** v5 -> v6 (gastos-da-ia AC 22, door 1): an empty transfer list; nothing is rebuilt backwards. */
function v5ToV6(doc: GameState): GameState {
  return { ...doc, schemaVersion: SCHEMA_VERSION, market: { ...doc.market, transfers: [] } };
}

/**
 * Door 1: reads any stored document. v6 passes through; v5 to v1 migrate forward, each through
 * the next (copa-nacional AC 51, 53; gastos-da-ia AC 22, 23); anything else is incompatible
 * (gastos-da-ia AC 24).
 */
export function migrateSave(doc: unknown): MigrationResult {
  const version = typeof doc === "object" && doc !== null ? (doc as { schemaVersion?: unknown }).schemaVersion : undefined;
  if (version === SCHEMA_VERSION) return { kind: "ok", state: doc as GameState };
  if (version !== 1 && version !== 2 && version !== 3 && version !== 4 && version !== 5) return { kind: "incompatible", version };
  let old = JSON.parse(JSON.stringify(doc)) as OldDocument;
  if (version === 1) v1ToV2(old);
  if (version <= 2) old = v2ToV3(old);
  const v4 = version <= 3 ? v3ToV4(old) : (old as unknown as GameState);
  const v5 = version <= 4 ? v4ToV5(v4) : v4;
  return { kind: "ok", state: v5ToV6(v5) };
}
