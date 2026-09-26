import { CLUB_IDENTITIES, generatePlayerName, uniqueName } from "./names";
import { initialFinance, salaryFor } from "./finance";
import { bell, createRng, mix32, pick, randInt, shuffle, type Rng } from "./rng";
import {
  AGE_MAX,
  AGE_MIN,
  RATING_MAX,
  RATING_MIN,
  FRESH_CONDITION,
  SCHEMA_VERSION,
  type Club,
  type GameState,
  type League,
  type Market,
  type Match,
  type Player,
  type Position,
  type Round,
} from "./types";

export const CLUBS_PER_LEAGUE = 20;
export const SQUAD_SHAPE: readonly { position: Position; count: number }[] = [
  { position: "GK", count: 3 },
  { position: "DF", count: 7 },
  { position: "MF", count: 7 },
  { position: "FW", count: 5 },
];
export const PLAYERS_PER_CLUB = SQUAD_SHAPE.reduce((n, s) => n + s.count, 0);

const CLUB_BASE_MIN = 58;
const CLUB_BASE_MAX = 80;
const RATING_SPREAD = 7;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function generateAge(rng: Rng): number {
  // Biased towards the middle of the range.
  const u = (rng.next() + rng.next()) / 2;
  return clamp(AGE_MIN + Math.floor(u * (AGE_MAX - AGE_MIN + 1)), AGE_MIN, AGE_MAX);
}

/** A fresh player; the salary follows the rating at creation and is stored (door 2). */
export function makePlayer(id: string, name: string, position: Position, age: number, rating: number): Player {
  return { id, name, position, age, rating, ...FRESH_CONDITION, salary: salaryFor(rating) };
}

function generatePlayer(rng: Rng, id: string, position: Position, base: number, taken: Set<string>): Player {
  const name = uniqueName(rng, taken, generatePlayerName);
  const age = generateAge(rng);
  const rating = clamp(Math.round(base + bell(rng) * RATING_SPREAD), RATING_MIN, RATING_MAX);
  return makePlayer(id, name, position, age, rating);
}

export const FREE_AGENTS_PER_POSITION = 10;
const FREE_AGENT_RATING = { min: 45, max: 70 } as const;
export const JUNIORS_PER_WINDOW = 3;
const JUNIOR_AGE = 17;
const JUNIOR_RATING = { min: 45, max: 62 } as const;

/** AC 35: 10 per position, rating 45-70, ids `fa-<n>` (door 4). */
export function generateFreeAgents(rng: Rng, taken: Set<string>): Player[] {
  const out: Player[] = [];
  for (const position of SQUAD_SHAPE.map((s) => s.position)) {
    for (let i = 0; i < FREE_AGENTS_PER_POSITION; i++) {
      const name = uniqueName(rng, taken, generatePlayerName);
      out.push(makePlayer(`fa-${out.length + 1}`, name, position, generateAge(rng), randInt(rng, FREE_AGENT_RATING.min, FREE_AGENT_RATING.max)));
    }
  }
  return out;
}

/** AC 37: three 17-year-olds rated 45-62, ids `jr-<season>-<window>-<n>` (door 4). */
export function generateJuniors(rng: Rng, taken: Set<string>, season: number, window: number): Player[] {
  const positions = SQUAD_SHAPE.map((s) => s.position);
  return Array.from({ length: JUNIORS_PER_WINDOW }, (_, i) => {
    const name = uniqueName(rng, taken, generatePlayerName);
    const position = pick(rng, positions);
    return makePlayer(`jr-${season}-${window}-${i + 1}`, name, position, JUNIOR_AGE, randInt(rng, JUNIOR_RATING.min, JUNIOR_RATING.max));
  });
}

/** Every player name in the save, so new players never repeat one. */
export function takenNames(state: Pick<GameState, "leagues"> & { market?: Market }): Set<string> {
  const names = new Set<string>();
  for (const league of state.leagues) for (const club of league.clubs) for (const p of club.players) names.add(p.name);
  for (const p of [...(state.market?.freeAgents ?? []), ...(state.market?.juniors ?? [])]) names.add(p.name);
  return names;
}

function generateClub(rng: Rng, index: number, name: string, base: number, takenPlayers: Set<string>): Club {
  const id = `c${index + 1}`;
  const players: Player[] = [];
  let n = 0;
  for (const shape of SQUAD_SHAPE) {
    for (let i = 0; i < shape.count; i++) {
      players.push(generatePlayer(rng, `${id}-p${++n}`, shape.position, base, takenPlayers));
    }
  }
  return { id, name, players, lineup: null, finance: initialFinance(players), forSale: [] };
}

/**
 * Double round-robin by the circle method. First half: n-1 rounds; second half mirrors
 * home/away. Every club plays once per round, every pair meets once per half.
 */
export function generateSchedule(clubIds: readonly string[]): Round[] {
  const n = clubIds.length;
  if (n % 2 !== 0) throw new Error("schedule needs an even number of clubs");
  const fixed = clubIds[0] as string;
  let rotating = clubIds.slice(1);
  const firstHalf: [string, string][][] = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs: [string, string][] = [];
    const last = rotating[rotating.length - 1] as string;
    // Alternate the fixed club's home/away so nobody gets a long run at home.
    pairs.push(r % 2 === 0 ? [fixed, last] : [last, fixed]);
    for (let i = 0; i < (n - 2) / 2; i++) {
      const a = rotating[i] as string;
      const b = rotating[n - 3 - i] as string;
      pairs.push(i % 2 === 0 ? [a, b] : [b, a]);
    }
    firstHalf.push(pairs);
    rotating = [last, ...rotating.slice(0, -1)];
  }
  const rounds: Round[] = [];
  const push = (pairs: [string, string][]) => {
    const number = rounds.length + 1;
    const matches: Match[] = pairs.map(([homeId, awayId], i) => ({ id: `r${number}-m${i + 1}`, homeId, awayId, result: null }));
    rounds.push({ number, matches });
  };
  for (const pairs of firstHalf) push(pairs);
  for (const pairs of firstHalf) push(pairs.map(([h, a]) => [a, h]));
  return rounds;
}

export function generateLeague(rng: Rng, id: string, name: string): League {
  const takenPlayers = new Set<string>();
  // Club strength spread evenly across the range, then shuffled so ids do not encode strength.
  const bases = shuffle(
    rng,
    Array.from({ length: CLUBS_PER_LEAGUE }, (_, i) => CLUB_BASE_MIN + ((CLUB_BASE_MAX - CLUB_BASE_MIN) * i) / (CLUBS_PER_LEAGUE - 1)),
  );
  // Every league has the same 20 identities (like the real Série A); order and strength vary by seed.
  const names = shuffle(rng, CLUB_IDENTITIES.map((c) => c.name));
  const clubs = bases.map((base, i) => generateClub(rng, i, names[i] as string, base, takenPlayers));
  const order = shuffle(rng, clubs.map((c) => c.id));
  return { id, name, clubs, rounds: generateSchedule(order), currentRound: 0 };
}

export function newGame(seed: number): GameState {
  const rng = createRng(seed);
  const league = generateLeague(rng, "l1", "Campeonato Nacional");
  // Door 6: the market has its own stream, so the leagues and rngState match every earlier save of this seed.
  const marketRng = createRng(mix32(seed, 2));
  const taken = takenNames({ leagues: [league] });
  const market: Market = {
    freeAgents: generateFreeAgents(marketRng, taken),
    juniors: generateJuniors(marketRng, taken, 1, 1),
    offers: [],
  };
  return {
    schemaVersion: SCHEMA_VERSION,
    seed,
    rngState: rng.getState(),
    season: 1,
    userClubId: null,
    leagues: [league],
    market,
  };
}

/** A fresh seed from wall-clock time; the only non-deterministic input, taken once per new game. */
export function randomSeed(): number {
  return randInt(createRng(Date.now() >>> 0), 1, 2 ** 31 - 1);
}
