import type { Rng } from "./rng";
import type { MatchEvent, MatchResult, Player, Position } from "./types";

/** Everything the simulator needs to know about one side. */
export interface TeamSheet {
  clubId: string;
  starters: Player[];
}

export interface SimulatedMatch {
  result: MatchResult;
  events: MatchEvent[];
}

// Tunables. Calibrated by src/engine/balance.test.ts (C25, C26).
const HOME_MIDFIELD_BONUS = 1.25;
const HOME_ATTACK_BONUS = 1.08;
const BASE_CHANCE_PER_MINUTE = 0.14;
const ON_TARGET = 0.55;
const BASE_GOAL_ON_TARGET = 0.39;
const SCORER_WEIGHT: Record<Position, number> = { GK: 0.05, DF: 0.5, MF: 2, FW: 5 };

interface Strength {
  gk: number;
  def: number;
  mid: number;
  att: number;
}

function mean(values: number[], fallback: number): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : fallback;
}

function strength(sheet: TeamSheet): Strength {
  const of = (pos: Position) => sheet.starters.filter((p) => p.position === pos).map((p) => p.rating);
  const gk = mean(of("GK"), 40);
  const def = mean(of("DF"), 40);
  const mid = mean(of("MF"), 40);
  const att = mean(of("FW"), 40);
  // Midfielders contribute to attack and defence; defenders help the keeper a little.
  return {
    gk: gk * 0.7 + def * 0.3,
    def: def * 0.75 + mid * 0.25,
    mid,
    att: att * 0.7 + mid * 0.3,
  };
}

function pickScorer(rng: Rng, sheet: TeamSheet): Player {
  const weights = sheet.starters.map((p) => SCORER_WEIGHT[p.position] * p.rating);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng.next() * total;
  for (let i = 0; i < sheet.starters.length; i++) {
    r -= weights[i] as number;
    if (r <= 0) return sheet.starters[i] as Player;
  }
  return sheet.starters[sheet.starters.length - 1] as Player;
}

/** Minute-by-minute event simulation (AD-007). Deterministic for a given Rng state (door 2). */
export function simulateMatch(home: TeamSheet, away: TeamSheet, rng: Rng): SimulatedMatch {
  const h = strength(home);
  const a = strength(away);
  const homeMid = h.mid * HOME_MIDFIELD_BONUS;
  const possessionHome = homeMid / (homeMid + a.mid);

  const events: MatchEvent[] = [];
  const goals: MatchResult["goals"] = [];
  let homeGoals = 0;
  let awayGoals = 0;

  events.push({ minute: 1, type: "kickoff", clubId: home.clubId });

  for (let minute = 1; minute <= 90; minute++) {
    const homeHasBall = rng.next() < possessionHome;
    const attacker = homeHasBall ? home : away;
    const attStrength = homeHasBall ? h.att * HOME_ATTACK_BONUS : a.att;
    const defence = homeHasBall ? a : h;

    const chance = BASE_CHANCE_PER_MINUTE * Math.pow(attStrength / defence.def, 1.5);
    if (rng.next() < chance) {
      const shooter = pickScorer(rng, attacker);
      if (rng.next() < ON_TARGET) {
        const goalProb = BASE_GOAL_ON_TARGET * Math.pow(shooter.rating / defence.gk, 1.2);
        if (rng.next() < goalProb) {
          events.push({ minute, type: "goal", clubId: attacker.clubId, playerId: shooter.id });
          goals.push({ minute, clubId: attacker.clubId, playerId: shooter.id });
          if (homeHasBall) homeGoals++;
          else awayGoals++;
        } else {
          events.push({ minute, type: "shot_saved", clubId: attacker.clubId, playerId: shooter.id });
        }
      } else {
        events.push({ minute, type: "shot_missed", clubId: attacker.clubId, playerId: shooter.id });
      }
    }

    if (minute === 45) events.push({ minute: 45, type: "halftime", clubId: home.clubId });
  }

  events.push({ minute: 90, type: "fulltime", clubId: home.clubId });
  return { result: { homeGoals, awayGoals, goals }, events };
}
