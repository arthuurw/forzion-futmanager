/**
 * Door 3 of partida-ao-vivo: the match engine as a one-minute step.
 * A LiveRound lives in memory only (door 4); every match has its own Rng (door 2).
 */
import { AI_FORMATION, autoLineup, formationSlots, isAvailable } from "./lineup";
import { createRng, mix32, randInt, type Rng } from "./rng";
import { effectiveRating } from "./strength";
import type {
  Condition,
  FormationName,
  GameState,
  Goal,
  League,
  MatchEvent,
  MatchResult,
  PlayerCore,
  Position,
  Posture,
} from "./types";

export const MAX_SUBS = 5;
export const MATCH_MINUTES = 90;
export const HALFTIME = 45;

// Tunables. Calibrated by src/engine/balance.test.ts.
const HOME_MIDFIELD_BONUS = 1.2;
const HOME_ATTACK_BONUS = 1.08;
const BASE_CHANCE_PER_MINUTE = 0.14;
const ON_TARGET = 0.55;
const BASE_GOAL_ON_TARGET = 0.39;
const SCORER_WEIGHT: Record<Position, number> = { GK: 0.05, DF: 0.5, MF: 2, FW: 5 };
const CREATE: Record<Posture, number> = { defensive: 0.8, balanced: 1, attacking: 1.25 };
const CONCEDE: Record<Posture, number> = { defensive: 0.75, balanced: 1, attacking: 1.12 };
const YELLOW_PER_SIDE_MINUTE = 0.024;
const DIRECT_RED_PER_SIDE_MINUTE = 0.0004;
const BOOKED_CAUTION = 0.2;
const CARD_WEIGHT: Record<Position, number> = { GK: 0.2, DF: 3, MF: 2, FW: 1 };
const INJURY_PER_SIDE_MINUTE = 0.00125;
const DRAIN_PER_MINUTE = 0.15;
const DRAIN_PER_MINUTE_VETERAN = 0.2;
const VETERAN_AGE = 30;
const AI_TIRED_FITNESS = 60;
const AI_TIRED_FROM_MINUTE = 60;
/** The AI benches players below this fitness when a rested one of the same position is available. */
const AI_REST_BELOW = 60;

export type LivePlayer = PlayerCore & Partial<Condition>;

export type Vacancy = "injury" | "red";

export interface VacantSlot {
  why: Vacancy;
  /** Who left the slot. */
  playerId: string;
}

export interface LiveSide {
  clubId: string;
  isUser: boolean;
  formation: FormationName | null;
  /** Position each slot asks for. */
  slotPos: Position[];
  /** Player id per slot, or null when the slot is empty. */
  slots: (string | null)[];
  /** Why an empty slot is empty and who left it, by slot index. */
  vacancy: Record<number, VacantSlot>;
  posture: Posture;
  /** Players who can still come on. */
  bench: string[];
  subsUsed: number;
  subbedOff: string[];
  sentOff: string[];
  /** Injured in this match -> rounds out. */
  injured: Record<string, number>;
  /** Yellow cards in this match. */
  yellows: Record<string, number>;
  /** Live fitness of everyone who has been on the pitch. */
  fitness: Record<string, number>;
  /** Everyone who entered the pitch, in order. */
  played: string[];
}

export interface LiveMatch {
  matchId: string;
  home: LiveSide;
  away: LiveSide;
  homeGoals: number;
  awayGoals: number;
  goals: Goal[];
  events: MatchEvent[];
  rngState: number;
}

export interface LiveRound {
  /** Index into league.rounds. */
  roundIndex: number;
  roundNumber: number;
  /** Last minute simulated, 0 before kick-off. */
  minute: number;
  userClubId: string | null;
  matches: LiveMatch[];
  /** Snapshot of every player in the round. */
  players: Record<string, LivePlayer>;
}

// ---------- building sides ----------

export function makeSide(
  clubId: string,
  slotPos: Position[],
  slots: (string | null)[],
  bench: string[],
  players: Record<string, LivePlayer>,
  opts: { formation?: FormationName | null; posture?: Posture; isUser?: boolean } = {},
): LiveSide {
  const fitness: Record<string, number> = {};
  const played: string[] = [];
  for (const id of slots) {
    if (!id) continue;
    fitness[id] = players[id]?.fitness ?? 100;
    played.push(id);
  }
  return {
    clubId,
    isUser: opts.isUser ?? false,
    formation: opts.formation ?? null,
    slotPos,
    slots: [...slots],
    vacancy: {},
    posture: opts.posture ?? "balanced",
    bench: [...bench],
    subsUsed: 0,
    subbedOff: [],
    sentOff: [],
    injured: {},
    yellows: {},
    fitness,
    played,
  };
}

export function makeMatch(matchId: string, home: LiveSide, away: LiveSide, rngState: number): LiveMatch {
  return { matchId, home, away, homeGoals: 0, awayGoals: 0, goals: [], events: [], rngState };
}

function sideOf(m: LiveMatch, clubId: string): LiveSide | null {
  if (m.home.clubId === clubId) return m.home;
  if (m.away.clubId === clubId) return m.away;
  return null;
}

// ---------- strength ----------

export interface Strength {
  gk: number;
  def: number;
  mid: number;
  att: number;
}

/** Sector strength = sum of effective ratings / slots the formation gives that sector. An empty slot counts 0. */
export function sideStrength(side: LiveSide, players: Record<string, LivePlayer>): Strength {
  const sum: Record<Position, number> = { GK: 0, DF: 0, MF: 0, FW: 0 };
  const count: Record<Position, number> = { GK: 0, DF: 0, MF: 0, FW: 0 };
  side.slotPos.forEach((pos, i) => {
    count[pos]++;
    const id = side.slots[i];
    const p = id ? players[id] : undefined;
    if (id && p) sum[pos] += effectiveRating(p, pos, side.fitness[id] ?? p.fitness ?? 100);
  });
  const avg = (pos: Position) => (count[pos] ? sum[pos] / count[pos] : 0);
  const gk = avg("GK");
  const def = avg("DF");
  const mid = avg("MF");
  const att = avg("FW");
  const floor = (n: number) => Math.max(n, 20);
  return {
    gk: floor(gk * 0.7 + def * 0.3),
    def: floor(def * 0.75 + mid * 0.25),
    mid: floor(mid),
    att: floor(att * 0.7 + mid * 0.3),
  };
}

function onPitch(side: LiveSide): { id: string; slot: number; pos: Position }[] {
  const out: { id: string; slot: number; pos: Position }[] = [];
  side.slots.forEach((id, slot) => {
    if (id) out.push({ id, slot, pos: side.slotPos[slot] as Position });
  });
  return out;
}

function weightedPick<T>(rng: Rng, items: T[], weight: (t: T) => number): T | null {
  const weights = items.map(weight);
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return null;
  let r = rng.next() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i] as number;
    if (r <= 0) return items[i] as T;
  }
  return items[items.length - 1] ?? null;
}

// ---------- one minute of one match ----------

function removeFromPitch(side: LiveSide, slot: number, why: Vacancy): void {
  const playerId = side.slots[slot];
  side.slots[slot] = null;
  if (playerId) side.vacancy[slot] = { why, playerId };
}

/** Brings `inId` on in `slot`. No validation: callers check the rules. */
function bringOn(m: LiveMatch, side: LiveSide, slot: number, inId: string, minute: number, players: Record<string, LivePlayer>): void {
  const outId = side.slots[slot];
  if (outId) side.subbedOff.push(outId);
  const leaving = outId ?? side.vacancy[slot]?.playerId;
  side.slots[slot] = inId;
  delete side.vacancy[slot];
  side.bench = side.bench.filter((id) => id !== inId);
  side.subsUsed++;
  side.fitness[inId] = players[inId]?.fitness ?? 100;
  if (!side.played.includes(inId)) side.played.push(inId);
  m.events.push({ minute, type: "substitution", clubId: side.clubId, playerId: leaving ?? undefined, playerInId: inId });
}

function aiSubstitutions(m: LiveMatch, side: LiveSide, minute: number, players: Record<string, LivePlayer>): void {
  if (side.isUser) return;
  const bestFor = (pos: Position, samePositionOnly: boolean): string | null => {
    const candidates = side.bench
      .map((id) => players[id])
      .filter((p): p is LivePlayer => !!p && (!samePositionOnly || p.position === pos));
    candidates.sort((a, b) => effectiveRating(b, pos) - effectiveRating(a, pos) || a.id.localeCompare(b.id));
    return candidates[0]?.id ?? null;
  };
  // Injured players are replaced at once.
  side.slots.forEach((id, slot) => {
    if (id || side.vacancy[slot]?.why !== "injury" || side.subsUsed >= MAX_SUBS) return;
    const pos = side.slotPos[slot] as Position;
    const inId = bestFor(pos, true) ?? bestFor(pos, false);
    if (inId) bringOn(m, side, slot, inId, minute, players);
  });
  // From the 60th minute, one tired player per minute is swapped for a fresh one of the same position.
  if (minute < AI_TIRED_FROM_MINUTE || side.subsUsed >= MAX_SUBS) return;
  const tired = onPitch(side)
    .filter((o) => (side.fitness[o.id] ?? 100) < AI_TIRED_FITNESS)
    .sort((a, b) => (side.fitness[a.id] ?? 100) - (side.fitness[b.id] ?? 100));
  for (const t of tired) {
    const inId = bestFor(t.pos, true);
    if (inId) {
      bringOn(m, side, t.slot, inId, minute, players);
      return;
    }
  }
}

function discipline(m: LiveMatch, side: LiveSide, minute: number, rng: Rng, players: Record<string, LivePlayer>): void {
  const roll = rng.next();
  if (roll < DIRECT_RED_PER_SIDE_MINUTE) {
    const who = weightedPick(rng, onPitch(side), (o) => CARD_WEIGHT[o.pos]);
    if (who) sendOff(m, side, who.slot, who.id, minute);
    return;
  }
  if (roll < DIRECT_RED_PER_SIDE_MINUTE + YELLOW_PER_SIDE_MINUTE) {
    const who = weightedPick(rng, onPitch(side), (o) => CARD_WEIGHT[o.pos] * ((side.yellows[o.id] ?? 0) > 0 ? BOOKED_CAUTION : 1));
    if (!who) return;
    const count = (side.yellows[who.id] ?? 0) + 1;
    side.yellows[who.id] = count;
    if (count >= 2) sendOff(m, side, who.slot, who.id, minute);
    else m.events.push({ minute, type: "yellow", clubId: side.clubId, playerId: who.id });
  }
  void players;
}

function sendOff(m: LiveMatch, side: LiveSide, slot: number, id: string, minute: number): void {
  side.sentOff.push(id);
  removeFromPitch(side, slot, "red");
  m.events.push({ minute, type: "red", clubId: side.clubId, playerId: id });
}

function injuries(m: LiveMatch, side: LiveSide, minute: number, rng: Rng): void {
  if (rng.next() >= INJURY_PER_SIDE_MINUTE) return;
  const who = weightedPick(rng, onPitch(side), (o) => 1 + (100 - (side.fitness[o.id] ?? 100)) / 50);
  if (!who) return;
  side.injured[who.id] = randInt(rng, 1, 4);
  removeFromPitch(side, who.slot, "injury");
  m.events.push({ minute, type: "injury", clubId: side.clubId, playerId: who.id });
}

function drain(side: LiveSide, players: Record<string, LivePlayer>): void {
  for (const { id } of onPitch(side)) {
    const age = players[id]?.age ?? 25;
    const perMinute = age > VETERAN_AGE ? DRAIN_PER_MINUTE_VETERAN : DRAIN_PER_MINUTE;
    side.fitness[id] = Math.max(0, (side.fitness[id] ?? 100) - perMinute);
  }
}

function pickShooter(rng: Rng, side: LiveSide, players: Record<string, LivePlayer>): { id: string; pos: Position } | null {
  const who = weightedPick(rng, onPitch(side), (o) => SCORER_WEIGHT[o.pos] * (players[o.id]?.rating ?? 50));
  return who ? { id: who.id, pos: who.pos } : null;
}

/** Plays `minute` of match `m` in place. */
export function stepMatch(m: LiveMatch, minute: number, players: Record<string, LivePlayer>, rng: Rng): void {
  if (minute === 1) m.events.push({ minute: 1, type: "kickoff", clubId: m.home.clubId });

  const h = sideStrength(m.home, players);
  const a = sideStrength(m.away, players);
  const homeMid = h.mid * HOME_MIDFIELD_BONUS;
  const homeHasBall = rng.next() < homeMid / (homeMid + a.mid);
  const attacker = homeHasBall ? m.home : m.away;
  const defender = homeHasBall ? m.away : m.home;
  const attStrength = homeHasBall ? h.att * HOME_ATTACK_BONUS : a.att;
  const defStrength = homeHasBall ? a : h;

  const chance =
    BASE_CHANCE_PER_MINUTE * Math.pow(attStrength / defStrength.def, 1.5) * CREATE[attacker.posture] * CONCEDE[defender.posture];
  if (rng.next() < chance) {
    const shooter = pickShooter(rng, attacker, players);
    if (shooter) {
      if (rng.next() < ON_TARGET) {
        const p = players[shooter.id];
        const shooterRating = p ? effectiveRating(p, shooter.pos, attacker.fitness[shooter.id]) : 50;
        const goalProb = BASE_GOAL_ON_TARGET * Math.pow(shooterRating / defStrength.gk, 1.2);
        if (rng.next() < goalProb) {
          m.events.push({ minute, type: "goal", clubId: attacker.clubId, playerId: shooter.id });
          m.goals.push({ minute, clubId: attacker.clubId, playerId: shooter.id });
          if (homeHasBall) m.homeGoals++;
          else m.awayGoals++;
        } else {
          m.events.push({ minute, type: "shot_saved", clubId: attacker.clubId, playerId: shooter.id });
        }
      } else {
        m.events.push({ minute, type: "shot_missed", clubId: attacker.clubId, playerId: shooter.id });
      }
    }
  }

  for (const side of [m.home, m.away]) {
    discipline(m, side, minute, rng, players);
    injuries(m, side, minute, rng);
    drain(side, players);
  }
  for (const side of [m.home, m.away]) aiSubstitutions(m, side, minute, players);

  if (minute === HALFTIME) m.events.push({ minute: HALFTIME, type: "halftime", clubId: m.home.clubId });
  if (minute === MATCH_MINUTES) m.events.push({ minute: MATCH_MINUTES, type: "fulltime", clubId: m.home.clubId });
}

export function resultOf(m: LiveMatch): MatchResult {
  return { homeGoals: m.homeGoals, awayGoals: m.awayGoals, goals: m.goals.map((g) => ({ ...g })) };
}

// ---------- the round ----------

function clone<T>(value: T): T {
  // Plain JSON everywhere, so this is a faithful deep copy without DOM globals (door 3 of the core).
  return JSON.parse(JSON.stringify(value)) as T;
}

function userLeagueOf(state: GameState): League {
  const league = state.leagues[0];
  if (!league) throw new Error("save has no league");
  return league;
}

/** Door 2: the seed of each match depends only on the save's state, the round and the match's index. */
export function matchSeed(rngState: number, roundNumber: number, matchIndex: number): number {
  return mix32(rngState, roundNumber * 16 + matchIndex);
}

export function startRound(state: GameState): LiveRound {
  const league = userLeagueOf(state);
  const round = league.rounds[league.currentRound];
  if (!round) throw new Error("season is over");
  const players: Record<string, LivePlayer> = {};
  const clubs = new Map(league.clubs.map((c) => [c.id, c]));
  for (const c of league.clubs) for (const p of c.players) players[p.id] = { ...p };

  const sideFor = (clubId: string): LiveSide => {
    const club = clubs.get(clubId);
    if (!club) throw new Error(`unknown club ${clubId}`);
    const isUser = clubId === state.userClubId;
    const lineup = isUser && club.lineup ? club.lineup : autoLineup(club, AI_FORMATION, undefined, AI_REST_BELOW);
    const slotPos = formationSlots(lineup.formation);
    const starters = lineup.starters.map((id) => {
      const p = id ? club.players.find((x) => x.id === id) : undefined;
      return p && isAvailable(p) ? p.id : null;
    });
    const onField = new Set(starters.filter((id): id is string => !!id));
    const bench = club.players.filter((p) => isAvailable(p) && !onField.has(p.id)).map((p) => p.id);
    return makeSide(clubId, slotPos, starters, bench, players, { formation: lineup.formation, posture: lineup.posture ?? "balanced", isUser });
  };

  const matches = round.matches.map((match, i) =>
    makeMatch(match.id, sideFor(match.homeId), sideFor(match.awayId), matchSeed(state.rngState, round.number, i)),
  );
  return { roundIndex: league.currentRound, roundNumber: round.number, minute: 0, userClubId: state.userClubId, matches, players };
}

function stepInPlace(live: LiveRound): void {
  live.minute++;
  for (const m of live.matches) {
    const rng = createRng(m.rngState);
    stepMatch(m, live.minute, live.players, rng);
    m.rngState = rng.getState();
  }
}

/** Advances every match by one minute. Pure: returns a new LiveRound. */
export function step(input: LiveRound): LiveRound {
  if (input.minute >= MATCH_MINUTES) return input;
  const live = clone(input);
  stepInPlace(live);
  return live;
}

/** Plays every minute left. Same result as calling step() until 90, with one copy instead of ninety. */
export function runToEnd(input: LiveRound): LiveRound {
  if (input.minute >= MATCH_MINUTES) return input;
  const live = clone(input);
  while (live.minute < MATCH_MINUTES) stepInPlace(live);
  return live;
}

export function userMatch(live: LiveRound): LiveMatch | null {
  if (!live.userClubId) return null;
  return live.matches.find((m) => m.home.clubId === live.userClubId || m.away.clubId === live.userClubId) ?? null;
}

// ---------- the user's decisions ----------

export type SubRefusal = "limit" | "sent_off" | "returning" | "not_on_bench" | "no_match";
export type Decision<T> = { ok: true; live: T } | { ok: false; reason: SubRefusal };

/** Puts `inId` into `slot` of the user's side. Applies from the next minute. */
export function substitute(input: LiveRound, clubId: string, slot: number, inId: string): Decision<LiveRound> {
  const live = clone(input);
  const m = live.matches.find((x) => sideOf(x, clubId));
  const side = m ? sideOf(m, clubId) : null;
  if (!m || !side || slot < 0 || slot >= side.slots.length) return { ok: false, reason: "no_match" };
  if (side.subsUsed >= MAX_SUBS) return { ok: false, reason: "limit" };
  if (side.vacancy[slot]?.why === "red") return { ok: false, reason: "sent_off" };
  if (side.subbedOff.includes(inId)) return { ok: false, reason: "returning" };
  if (!side.bench.includes(inId)) return { ok: false, reason: "not_on_bench" };
  bringOn(m, side, slot, inId, live.minute, live.players);
  return { ok: true, live };
}

/**
 * Re-seats the players on the pitch in the slots of `formation`: same-position players first,
 * then the rest wherever a slot is left (out of position). Nobody leaves; empty slots stay empty.
 */
export function changeFormation(input: LiveRound, clubId: string, formation: FormationName): LiveRound {
  const live = clone(input);
  const m = live.matches.find((x) => sideOf(x, clubId));
  const side = m ? sideOf(m, clubId) : null;
  if (!side) return input;
  const newPos = formationSlots(formation);
  const ids = side.slots.filter((id): id is string => !!id);
  const vacancies = side.slots.map((id, i) => (id ? null : side.vacancy[i] ?? null)).filter((v): v is VacantSlot => !!v);
  const seats: (string | null)[] = newPos.map(() => null);
  const left = [...ids];
  newPos.forEach((pos, i) => {
    const k = left.findIndex((id) => live.players[id]?.position === pos);
    if (k >= 0) seats[i] = left.splice(k, 1)[0] as string;
  });
  // Fill the remaining slots from the back so the empty ones (vacancies) sit where the losses were.
  const emptyIdx = seats.map((s, i) => (s ? -1 : i)).filter((i) => i >= 0);
  const toFill = emptyIdx.slice(0, left.length);
  toFill.forEach((slotIdx, k) => (seats[slotIdx] = left[k] as string));
  const vacancy: Record<number, VacantSlot> = {};
  emptyIdx.slice(left.length).forEach((slotIdx, k) => {
    const v = vacancies[k];
    if (v) vacancy[slotIdx] = v;
  });
  side.formation = formation;
  side.slotPos = newPos;
  side.slots = seats;
  side.vacancy = vacancy;
  return live;
}

export function changePosture(input: LiveRound, clubId: string, posture: Posture): LiveRound {
  const live = clone(input);
  const m = live.matches.find((x) => sideOf(x, clubId));
  const side = m ? sideOf(m, clubId) : null;
  if (!side) return input;
  side.posture = posture;
  return live;
}
