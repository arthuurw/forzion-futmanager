import { generateClubName, generatePlayerName, uniqueName } from "./names";
import { bell, createRng, randInt, shuffle, type Rng } from "./rng";
import {
  AGE_MAX,
  AGE_MIN,
  RATING_MAX,
  RATING_MIN,
  SCHEMA_VERSION,
  type Club,
  type GameState,
  type League,
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

function generatePlayer(rng: Rng, id: string, position: Position, base: number, taken: Set<string>): Player {
  return {
    id,
    name: uniqueName(rng, taken, generatePlayerName),
    position,
    age: generateAge(rng),
    rating: clamp(Math.round(base + bell(rng) * RATING_SPREAD), RATING_MIN, RATING_MAX),
  };
}

function generateClub(rng: Rng, index: number, base: number, takenClubs: Set<string>, takenPlayers: Set<string>): Club {
  const id = `c${index + 1}`;
  const players: Player[] = [];
  let n = 0;
  for (const shape of SQUAD_SHAPE) {
    for (let i = 0; i < shape.count; i++) {
      players.push(generatePlayer(rng, `${id}-p${++n}`, shape.position, base, takenPlayers));
    }
  }
  return { id, name: uniqueName(rng, takenClubs, generateClubName), players, lineup: null };
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
  const takenClubs = new Set<string>();
  const takenPlayers = new Set<string>();
  // Club strength spread evenly across the range, then shuffled so ids do not encode strength.
  const bases = shuffle(
    rng,
    Array.from({ length: CLUBS_PER_LEAGUE }, (_, i) => CLUB_BASE_MIN + ((CLUB_BASE_MAX - CLUB_BASE_MIN) * i) / (CLUBS_PER_LEAGUE - 1)),
  );
  const clubs = bases.map((base, i) => generateClub(rng, i, base, takenClubs, takenPlayers));
  const order = shuffle(rng, clubs.map((c) => c.id));
  return { id, name, clubs, rounds: generateSchedule(order), currentRound: 0 };
}

export function newGame(seed: number): GameState {
  const rng = createRng(seed);
  const league = generateLeague(rng, "l1", "Campeonato Nacional");
  return {
    schemaVersion: SCHEMA_VERSION,
    seed,
    rngState: rng.getState(),
    season: 1,
    userClubId: null,
    leagues: [league],
  };
}

/** A fresh seed from wall-clock time; the only non-deterministic input, taken once per new game. */
export function randomSeed(): number {
  return randInt(createRng(Date.now() >>> 0), 1, 2 ** 31 - 1);
}
