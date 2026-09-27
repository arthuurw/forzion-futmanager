/**
 * The national cup (copa-nacional): seeding, draws, single-match ties with penalties, and what a
 * cup date does to squads and money. Door 1 (shape), door 2 (match seeds), door 3 (draw seeds).
 */
import { strengthRanking } from "./board";
import { CUP_AFTER_ROUNDS, nextDate } from "./calendar";
import { applyRound } from "./condition";
import { attendanceFor } from "./finance";
import { makeMatch, resultOf, roundSnapshot, runToEnd, sideFor, userMatch, type LiveMatch, type LiveRound } from "./live";
import { createRng, mix32, randInt } from "./rng";
import type { RoundOutcome } from "./season";
import type { Competition, Cup, GameState, League, Ledger, Tie } from "./types";

export const NATIONAL_CUP_ID = "cup-nat";
export const NATIONAL_CUP_NAME = "Copa Nacional";
export const CUP_PHASE_NAMES = ["Preliminar", "16 avos", "Oitavas", "Quartas", "Semifinal", "Final"] as const;
/** AC 31: what the winner of each phase's tie receives. */
export const CUP_PRIZES = [150_000, 300_000, 500_000, 800_000, 1_200_000, 2_500_000] as const;
/** AC 8: the last 16 of the seeding play the preliminary round. */
export const PRELIMINARY_CLUBS = 16;
/** `userReached` / `cupReached` for the champion: one past the final. */
export const CHAMPION_REACHED = CUP_PHASE_NAMES.length;

/** Door 2 and door 3. */
const MATCH_SALT = 0xc0;
const DRAW_SALT = 0xd0;

/** AC 7: each division by strength, the Série A first. */
export function seedingByStrength(leagues: readonly League[]): string[] {
  return leagues.flatMap((l) => strengthRanking(l.clubs));
}

/** Door 2: the seed of tie `i` of phase `k`, from the `rngState` at the start of the date. */
export function cupMatchSeed(rngState: number, phase: number, tie: number): number {
  return mix32(mix32(rngState, MATCH_SALT), phase * 32 + tie);
}

/** Door 3: the draw's stream for phase `k`. */
export function drawSeed(rngState: number, phase: number): number {
  return mix32(mix32(rngState, DRAW_SALT), phase);
}

/** Who enters the draw of phase `k`, in seeding order (AC 8, AC 9). */
function qualified(cup: Cup, k: number): string[] {
  const rank = new Map(cup.seeding.map((id, i) => [id, i]));
  const bySeed = (ids: string[]) => ids.sort((a, b) => rank.get(a)! - rank.get(b)!);
  if (k === 0) return cup.seeding.slice(-PRELIMINARY_CLUBS);
  const winners = cup.phases[k - 1]!.ties.map((t) => t.winnerId).filter((id): id is string => !!id);
  if (k === 1) return bySeed([...cup.seeding.slice(0, cup.seeding.length - PRELIMINARY_CLUBS), ...winners]);
  return bySeed(winners);
}

/**
 * Door 3: shuffles the qualified clubs (Fisher-Yates with `randInt`) and pairs them in order;
 * the club lower in the seeding plays at home (AC 10). A phase is drawn once and never redrawn.
 */
export function drawPhase(cup: Cup, k: number, rngState: number): void {
  const phase = cup.phases[k];
  if (!phase || phase.ties.length) return;
  const rng = createRng(drawSeed(rngState, k));
  const clubs = qualified(cup, k);
  for (let i = clubs.length - 1; i > 0; i--) {
    const j = randInt(rng, 0, i);
    [clubs[i], clubs[j]] = [clubs[j]!, clubs[i]!];
  }
  const rank = new Map(cup.seeding.map((id, i) => [id, i]));
  for (let i = 0; i + 1 < clubs.length; i += 2) {
    const [a, b] = [clubs[i]!, clubs[i + 1]!];
    const [homeId, awayId] = rank.get(a)! > rank.get(b)! ? [a, b] : [b, a];
    phase.ties.push({ id: `${cup.id}-p${k}-m${phase.ties.length}`, homeId, awayId, result: null, penalties: null, winnerId: null });
  }
}

/** A season's cup: six phases on the calendar and the preliminary round already drawn (AC 11). */
export function newCup(seeding: string[], rngState: number): Cup {
  const cup: Cup = {
    id: NATIONAL_CUP_ID,
    name: NATIONAL_CUP_NAME,
    seeding: [...seeding],
    phases: CUP_PHASE_NAMES.map((name, k) => ({ name, afterLeagueRound: CUP_AFTER_ROUNDS[k]!, ties: [] })),
    currentPhase: 0,
  };
  drawPhase(cup, 0, rngState);
  return cup;
}

export function cupCompetition(cup: Cup): Competition {
  return { kind: "cup", cupId: cup.id };
}

/** The ties of the cup's current phase as a live date; `userClubId` null fields the AI's eleven everywhere. */
export function cupLive(state: GameState, cupIndex: number, rngState: number, userClubId: string | null): LiveRound {
  const cup = state.cups[cupIndex];
  const phase = cup?.phases[cup.currentPhase];
  if (!cup || !phase) throw new Error("cup is over");
  const { clubs, players } = roundSnapshot(state);
  const competition = cupCompetition(cup);
  const side = (clubId: string) => {
    const club = clubs.get(clubId);
    if (!club) throw new Error(`unknown club ${clubId}`);
    return sideFor(club, userClubId, players, competition);
  };
  const matches = phase.ties.map((tie, i): LiveMatch => ({
    ...makeMatch(tie.id, side(tie.homeId), side(tie.awayId), cupMatchSeed(rngState, cup.currentPhase, i), cup.id),
    knockout: true,
    penalties: null,
  }));
  const played = state.leagues[0]?.currentRound ?? 0;
  return { roundIndex: played, roundNumber: played, minute: 0, userClubId, matches, players, cup: { cupIndex, phase: cup.currentPhase } };
}

/** Starts the next date, which must be a cup phase (S1 AC 2). */
export function startCupDate(state: GameState): LiveRound {
  const date = nextDate(state);
  if (date.kind !== "cup") throw new Error("the next date is not a cup phase");
  return cupLive(state, date.cupIndex, state.rngState, state.userClubId);
}

function winnerOf(m: LiveMatch): string {
  const home = m.homeGoals - m.awayGoals || (m.penalties ? m.penalties.home - m.penalties.away : 0);
  return home > 0 ? m.home.clubId : m.away.clubId;
}

/** Writes a played phase into the cup, moves it on and draws the next phase with `drawState` (door 3). */
function closePhase(cup: Cup, live: LiveRound, drawState: number): void {
  const k = cup.currentPhase;
  const phase = cup.phases[k]!;
  phase.ties.forEach((tie, i) => {
    const m = live.matches[i];
    if (!m || m.matchId !== tie.id) throw new Error("live date does not match the draw");
    tie.result = resultOf(m);
    tie.penalties = m.penalties ?? null;
    tie.winnerId = winnerOf(m);
  });
  cup.currentPhase = k + 1;
  drawPhase(cup, k + 1, drawState);
}

/** Door 5: plays a phase with scores only - no money, no condition - for a migrated save. */
export function catchUpPhase(state: GameState, cupIndex: number, matchState: number, drawState: number): void {
  const cup = state.cups[cupIndex]!;
  closePhase(cup, runToEnd(cupLive(state, cupIndex, matchState, null)), drawState);
}

/**
 * Closes a cup date (S3-S5): results, penalties and winners, the cup's discipline, fatigue and
 * injuries, the home gate and the phase prize, the next draw, and the save's Rng once. The league
 * tables, season numbers, wages, sponsorship, interest, works and market do not move. Pure.
 */
export function finishCupDate(input: GameState, liveInput: LiveRound): RoundOutcome {
  if (!liveInput.cup) throw new Error("not a cup date");
  const live = runToEnd(liveInput);
  const state = JSON.parse(JSON.stringify(input)) as GameState;
  const { cupIndex, phase: k } = liveInput.cup;
  const cup = state.cups[cupIndex]!;
  if (cup.currentPhase !== k) throw new Error("cup phase already played");
  const ties: Tie[] = cup.phases[k]!.ties;

  closePhase(cup, live, input.rngState);
  for (const league of state.leagues) league.clubs = applyRound(league.clubs, live.matches, cupCompetition(cup));

  // AC 30, 31, 32, 34: gate for the home side, prize for the winner, nothing else.
  const clubs = new Map(state.leagues.flatMap((l) => l.clubs).map((c) => [c.id, c]));
  for (const tie of ties) {
    for (const clubId of [tie.homeId, tie.awayId]) {
      const f = clubs.get(clubId)!.finance;
      const attendance = clubId === tie.homeId ? attendanceFor(f, f.ticketPrice, 1) : 0;
      const ledger: Ledger = {
        attendance,
        tickets: attendance * f.ticketPrice,
        sponsorship: 0,
        salaries: 0,
        interest: 0,
        transfersIn: f.pendingIn,
        transfersOut: f.pendingOut,
        cupPrize: clubId === tie.winnerId ? CUP_PRIZES[k]! : 0,
      };
      f.cash += ledger.tickets + ledger.cupPrize!;
      f.pendingIn = 0;
      f.pendingOut = 0;
      f.lastRound = ledger;
    }
  }

  const rng = createRng(state.rngState);
  rng.next();
  state.rngState = rng.getState();

  return {
    state,
    roundNumber: live.roundNumber,
    userEvents: userMatch(live)?.events ?? [],
    results: ties.map((t) => ({ matchId: t.id, homeId: t.homeId, awayId: t.awayId, result: t.result!, penalties: t.penalties })),
    cup: { cupIndex, phase: k },
  };
}

/** The winner of the final, once it is played. */
export function cupChampion(cup: Cup): string | null {
  return cup.phases[cup.phases.length - 1]?.ties[0]?.winnerId ?? null;
}

/** The loser of the final, once it is played. */
export function cupRunnerUp(cup: Cup): string | null {
  const final = cup.phases[cup.phases.length - 1]?.ties[0];
  if (!final?.winnerId) return null;
  return final.winnerId === final.homeId ? final.awayId : final.homeId;
}

/** AC 36: the last phase the club played (0 = Preliminar), 6 for the champion; null when it never played. */
export function cupReached(cup: Cup, clubId: string): number | null {
  if (cupChampion(cup) === clubId) return CHAMPION_REACHED;
  let reached: number | null = null;
  cup.phases.forEach((phase, k) => {
    if (phase.ties.some((t) => t.homeId === clubId || t.awayId === clubId)) reached = k;
  });
  return reached;
}

/** True while the club has not lost a tie in this cup. */
export function isAlive(cup: Cup, clubId: string): boolean {
  return !cup.phases.some((p) => p.ties.some((t) => t.winnerId && t.winnerId !== clubId && (t.homeId === clubId || t.awayId === clubId)));
}
