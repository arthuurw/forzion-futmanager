/**
 * What a round does to the squads: fitness, injuries, suspensions and morale (S3-S5 of partida-ao-vivo).
 * Door 5 (discipline) and door 7 (idle rounds) live here.
 */
import type { LiveMatch, LiveSide } from "./live";
import { LEAGUE, type Club, type Competition, type CupDiscipline, type Player } from "./types";

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

/**
 * One player's condition and season numbers after a date (AC 36). In a cup date (copa-nacional S4)
 * the cards and the suspension are the cup's, the season numbers do not move, and a club that did
 * not play (`side` null) only rests and heals. Pure.
 */
export function playerAfterRound(
  p: Player,
  side: LiveSide | null,
  outcome: Outcome | null,
  goals = 0,
  competition: Competition = LEAGUE,
): Player {
  const next: Player = { ...p };
  const cupId = competition.kind === "cup" ? competition.cupId : null;
  const discipline: CupDiscipline =
    cupId === null
      ? { yellowCards: p.yellowCards, suspendedRounds: p.suspendedRounds }
      : { yellowCards: 0, suspendedRounds: 0, ...p.cupDiscipline?.[cupId] };
  if (cupId === null) next.seasonGoals = (p.seasonGoals ?? 0) + goals;
  const wasOut = p.injuryRounds > 0 || discipline.suspendedRounds > 0;

  // Serve the date they were out for.
  if (next.injuryRounds > 0) next.injuryRounds--;
  if (cupId !== null && !side) {
    // AC 28: a club without a cup match rests; idle rounds and morale stay.
    next.fitness = clamp(p.fitness + RECOVERY_RESTED, 0, 100);
    return next;
  }
  if (discipline.suspendedRounds > 0) discipline.suspendedRounds--;

  const played = !!side && side.played.includes(p.id);
  if (played && side) {
    if (cupId === null) next.seasonGames = (p.seasonGames ?? 0) + 1;
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
      // A red card suspends for the next date; that match's yellows do not count towards accumulation.
      discipline.suspendedRounds += 1;
    } else if ((side.yellows[p.id] ?? 0) > 0) {
      discipline.yellowCards += 1;
      if (discipline.yellowCards >= YELLOWS_FOR_SUSPENSION) {
        discipline.suspendedRounds += 1;
        discipline.yellowCards = 0;
      }
    }
  }
  if (cupId === null) {
    next.yellowCards = discipline.yellowCards;
    next.suspendedRounds = discipline.suspendedRounds;
  } else {
    next.cupDiscipline = { ...p.cupDiscipline, [cupId]: discipline };
  }
  return next;
}

/** A shoot-out decides a level knockout tie: the side that goes through counts as a win (copa-nacional AC 27). */
function outcomeFor(m: LiveMatch, side: LiveSide): Outcome {
  const home = side === m.home;
  const mine = home ? m.homeGoals : m.awayGoals;
  const theirs = home ? m.awayGoals : m.homeGoals;
  if (mine === theirs && m.penalties) {
    const pens = home ? m.penalties.home - m.penalties.away : m.penalties.away - m.penalties.home;
    return pens > 0 ? "win" : "loss";
  }
  return mine > theirs ? "win" : mine < theirs ? "loss" : "draw";
}

/**
 * Applies a finished date to every club; `competition` says whose discipline it was. Cup goals do
 * not count in the season numbers (copa-nacional AC 18). Clubs are replaced, not mutated.
 */
export function applyRound(clubs: Club[], matches: LiveMatch[], competition: Competition = LEAGUE): Club[] {
  const sides = new Map<string, { m: LiveMatch; side: LiveSide }>();
  const goals = new Map<string, number>();
  for (const m of matches) {
    sides.set(m.home.clubId, { m, side: m.home });
    sides.set(m.away.clubId, { m, side: m.away });
    for (const g of m.goals) goals.set(g.playerId, (goals.get(g.playerId) ?? 0) + 1);
  }
  return clubs.map((club) => {
    const entry = sides.get(club.id);
    const side = entry?.side ?? null;
    const outcome = entry ? outcomeFor(entry.m, entry.side) : null;
    return { ...club, players: club.players.map((p) => playerAfterRound(p, side, outcome, goals.get(p.id) ?? 0, competition)) };
  });
}
