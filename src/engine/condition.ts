/**
 * What a round does to the squads: fitness, injuries, suspensions and morale (S3-S5 of partida-ao-vivo).
 * Door 5 (discipline) and door 7 (idle rounds) live here.
 */
import type { LiveMatch, LiveSide } from "./live";
import type { Club, Player } from "./types";

export const RECOVERY_RESTED = 30;
export const RECOVERY_PLAYED = 15;
export const YELLOWS_FOR_SUSPENSION = 3;
export const IDLE_ROUNDS_FOR_MORALE_DROP = 3;
export const MORALE_MIN = -2;
export const MORALE_MAX = 2;

type Outcome = "win" | "draw" | "loss";

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** One player's condition after a round. Pure. */
export function playerAfterRound(p: Player, side: LiveSide | null, outcome: Outcome | null): Player {
  const next: Player = { ...p };
  const wasOut = p.injuryRounds > 0 || p.suspendedRounds > 0;

  // Serve the round they were out for.
  if (next.injuryRounds > 0) next.injuryRounds--;
  if (next.suspendedRounds > 0) next.suspendedRounds--;

  const played = !!side && side.played.includes(p.id);
  if (played && side) {
    next.fitness = clamp(Math.round(side.fitness[p.id] ?? p.fitness) + RECOVERY_PLAYED, 0, 100);
    next.idleRounds = 0;
    if (outcome === "win") next.morale = clamp(next.morale + 1, MORALE_MIN, MORALE_MAX);
    if (outcome === "loss") next.morale = clamp(next.morale - 1, MORALE_MIN, MORALE_MAX);
  } else {
    next.fitness = clamp(p.fitness + RECOVERY_RESTED, 0, 100);
    if (!wasOut) {
      next.idleRounds++;
      if (next.idleRounds >= IDLE_ROUNDS_FOR_MORALE_DROP) {
        next.morale = clamp(next.morale - 1, MORALE_MIN, MORALE_MAX);
        next.idleRounds = 0;
      }
    }
  }

  if (side) {
    const injury = side.injured[p.id];
    if (injury) next.injuryRounds = injury;
    if (side.sentOff.includes(p.id)) {
      // A red card suspends for the next round; that match's yellows do not count towards accumulation.
      next.suspendedRounds += 1;
    } else if ((side.yellows[p.id] ?? 0) > 0) {
      next.yellowCards += 1;
      if (next.yellowCards >= YELLOWS_FOR_SUSPENSION) {
        next.suspendedRounds += 1;
        next.yellowCards = 0;
      }
    }
  }
  return next;
}

function outcomeFor(m: LiveMatch, side: LiveSide): Outcome {
  const mine = side === m.home ? m.homeGoals : m.awayGoals;
  const theirs = side === m.home ? m.awayGoals : m.homeGoals;
  return mine > theirs ? "win" : mine < theirs ? "loss" : "draw";
}

/** Applies a finished round to every club that played in it. Clubs are replaced, not mutated. */
export function applyRound(clubs: Club[], matches: LiveMatch[]): Club[] {
  const sides = new Map<string, { m: LiveMatch; side: LiveSide }>();
  for (const m of matches) {
    sides.set(m.home.clubId, { m, side: m.home });
    sides.set(m.away.clubId, { m, side: m.away });
  }
  return clubs.map((club) => {
    const entry = sides.get(club.id);
    const side = entry?.side ?? null;
    const outcome = entry ? outcomeFor(entry.m, entry.side) : null;
    return { ...club, players: club.players.map((p) => playerAfterRound(p, side, outcome)) };
  });
}
