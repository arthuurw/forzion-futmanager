/**
 * Treino-evolucao: the rating moves during the season, one league round at a time (AD-023).
 * The chances come from the age table of the turn (`EVOLUTION`), spread over the league's rounds.
 */
import { mix32, type Rng } from "./rng";
import { RATING_MAX, RATING_MIN, type Club, type Player, type Training } from "./types";

/**
 * AC 16 of multiplas-temporadas: rating change by age in a season; the first row whose `maxAge`
 * fits. Treino-evolucao AC 2: the source of the chances per round, no longer drawn at the turn.
 * Correcoes-validacao AC 30, AC 31: calibrated so 20 seasons stay within 5 points of the first
 * (was +2..+6, +1..+4, -1..+2, -2..+1, -4..0 up to 33).
 */
export const EVOLUTION: readonly { maxAge: number; min: number; max: number }[] = [
  { maxAge: 20, min: 1, max: 4 },
  { maxAge: 23, min: 0, max: 3 },
  { maxAge: 27, min: -1, max: 1 },
  { maxAge: 30, min: -2, max: 0 },
  { maxAge: 33, min: -4, max: -1 },
  { maxAge: Infinity, min: -6, max: -2 },
];

export function evolutionRange(age: number): { min: number; max: number } {
  return EVOLUTION.find((row) => age <= row.maxAge)!;
}

/** AC 3: training weighs on going up only. */
export const TRAINING_UP: Record<Training, number> = { light: 0.5, normal: 1, hard: 1.5 };
/** AC 11: fitness added to every recovery (30 at rest, 15 after playing). */
export const TRAINING_RECOVERY: Record<Training, number> = { light: 10, normal: 0, hard: -10 };
/** AC 12: the chance of an injury per side and minute is multiplied by this. */
export const TRAINING_INJURY: Record<Training, number> = { light: 0.8, normal: 1, hard: 1.3 };
/**
 * AC 3: who took the field this round goes up at twice the chance of who did not. Calibrated by
 * balance.test.ts so the strength of 20 seasons stays near the old table's (1 / 0,5 lost 2 points).
 */
export const PLAYED_UP = 1.3;
export const BENCH_UP = 0.65;
/** Door 3: salt of the evolution streams. */
const EVOLUTION_SALT = 0x7e;

/**
 * AC 2: the positive and the negative part of the mean of the age's band, per season. A band
 * `min..max` of whole numbers, each equally likely, as `rollover` drew it.
 */
function seasonParts(age: number): { up: number; down: number } {
  const row = evolutionRange(age);
  let up = 0;
  let down = 0;
  for (let x = row.min; x <= row.max; x++) {
    if (x > 0) up += x;
    if (x < 0) down -= x;
  }
  const n = row.max - row.min + 1;
  return { up: up / n, down: down / n };
}

/** AC 1-3, 8: the chance of +1 and of −1 in one round of a league of `rounds` rounds. */
export function evolutionChances(age: number, training: Training | undefined, played: boolean, rounds: number): { up: number; down: number } {
  const { up, down } = seasonParts(age);
  return { up: (up * TRAINING_UP[training ?? "normal"] * (played ? PLAYED_UP : BENCH_UP)) / rounds, down: down / rounds };
}

/** Door 3: the seed of league `division`'s evolution in round `roundNumber`, from the save's state before the round. */
export function evolutionSeed(rngState: number, roundNumber: number, division: number): number {
  return mix32(mix32(rngState, EVOLUTION_SALT), roundNumber * 16 + division);
}

function evolvePlayer(p: Player, training: Training | undefined, played: boolean, rng: Rng, round: number, rounds: number): Player {
  const { up, down } = evolutionChances(p.age, training, played, rounds);
  const r = rng.next();
  const delta = r < up ? 1 : r < up + down ? -1 : 0;
  // AC 4: at the limits the rating stays and nothing is written down.
  if (delta === 0 || p.rating + delta > RATING_MAX || p.rating + delta < RATING_MIN) return p;
  return { ...p, rating: p.rating + delta, ratingLog: [...(p.ratingLog ?? []), { round, delta }] };
}

/**
 * AC 1, 5: one league round of evolution for `clubs`, one draw per player, clubs then players.
 * `played`: who took the field this round. Pure: clubs are replaced, not mutated.
 */
export function evolveRound(clubs: Club[], played: ReadonlySet<string>, rng: Rng, round: number, rounds: number): Club[] {
  return clubs.map((club) => ({
    ...club,
    players: club.players.map((p) => evolvePlayer(p, club.training, played.has(p.id), rng, round, rounds)),
  }));
}
