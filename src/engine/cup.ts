/**
 * The cups (copa-nacional, copa-continental): seeding, draws, single-match ties with penalties,
 * and what a cup date does to squads and money. Door 1 (shape), door 2 (match seeds) and door 3
 * (draw seeds) of copa-nacional; doors 1 and 2 of copa-continental.
 */
import { strengthRanking } from "./board";
import { CONTINENTAL_AFTER_ROUNDS, CUP_AFTER_ROUNDS, nextDate } from "./calendar";
import { applyRound } from "./condition";
import { attendanceFor } from "./finance";
import { makeMatch, resultOf, roundSnapshot, runToEnd, sideFor, userMatch, type LiveMatch, type LiveRound } from "./live";
import { createRng, mix32, randInt } from "./rng";
import type { RoundOutcome } from "./season";
import type { Competition, Country, Cup, GameState, League, Ledger, Tie } from "./types";

export const NATIONAL_CUP_ID = "cup-nat";
export const NATIONAL_CUP_NAME = "Copa Nacional";
export const CUP_PHASE_NAMES = ["Preliminar", "16 avos", "Oitavas", "Quartas", "Semifinal", "Final"] as const;
/** AC 31: what the winner of each phase's tie receives. */
export const CUP_PRIZES = [150_000, 300_000, 500_000, 800_000, 1_200_000, 2_500_000] as const;
/** AC 8: the last 16 of the seeding play the preliminary round. */
export const PRELIMINARY_CLUBS = 16;
/** `userReached` / `cupReached` for the champion: one past the final. */
export const CHAMPION_REACHED = CUP_PHASE_NAMES.length;

export const CONTINENTAL_CUP_ID = "cup-cont";
export const CONTINENTAL_CUP_NAME = "Copa Continental";
export const CONTINENTAL_PHASE_NAMES = ["Oitavas", "Quartas", "Semifinal", "Final"] as const;
/** Copa-continental AC 12. */
export const CONTINENTAL_PRIZES = [800_000, 1_500_000, 2_500_000, 5_000_000] as const;
/** Copa-continental AC 2-4: places per country. */
export const CONTINENTAL_PLACES: Readonly<Record<Country, number>> = { BR: 6, AR: 5, PT: 5 };
/** Copa-continental AC 5: the order the countries alternate in the seeding. */
const CONTINENTAL_COUNTRIES: readonly Country[] = ["BR", "AR", "PT"];

/** What is fixed about a cup, by its id; the save keeps only the names and the anchors. */
interface CupFormat {
  name: string;
  phaseNames: readonly string[];
  afterRounds: readonly number[];
  prizes: readonly number[];
  /** Clubs at the bottom of the seeding that play phase 0; 0 = every club starts in phase 0. */
  preliminary: number;
  /** Copa-nacional doors 2 and 3; copa-continental door 2. */
  matchSalt: number;
  drawSalt: number;
}

const FORMATS: Readonly<Record<string, CupFormat>> = {
  [NATIONAL_CUP_ID]: {
    name: NATIONAL_CUP_NAME,
    phaseNames: CUP_PHASE_NAMES,
    afterRounds: CUP_AFTER_ROUNDS,
    prizes: CUP_PRIZES,
    preliminary: PRELIMINARY_CLUBS,
    matchSalt: 0xc0,
    drawSalt: 0xd0,
  },
  [CONTINENTAL_CUP_ID]: {
    name: CONTINENTAL_CUP_NAME,
    phaseNames: CONTINENTAL_PHASE_NAMES,
    afterRounds: CONTINENTAL_AFTER_ROUNDS,
    prizes: CONTINENTAL_PRIZES,
    preliminary: 0,
    matchSalt: 0xc1,
    drawSalt: 0xd1,
  },
};

function formatOf(cupId: string): CupFormat {
  const format = FORMATS[cupId];
  if (!format) throw new Error(`unknown cup ${cupId}`);
  return format;
}

/** The names of a cup's phases, first to final; a closed season's record keeps only the cup id. */
export function cupPhaseNames(cupId: string): readonly string[] {
  return formatOf(cupId).phaseNames;
}

/** AC 7: each division by strength, the Série A first. */
export function seedingByStrength(leagues: readonly League[]): string[] {
  return leagues.flatMap((l) => strengthRanking(l.clubs));
}

/** Door 2: the seed of tie `i` of phase `k`, from the `rngState` at the start of the date; each cup has its own salt. */
export function cupMatchSeed(rngState: number, phase: number, tie: number, cupId = NATIONAL_CUP_ID): number {
  return mix32(mix32(rngState, formatOf(cupId).matchSalt), phase * 32 + tie);
}

/** Door 3: the draw's stream for phase `k`; each cup has its own salt (copa-continental door 2). */
export function drawSeed(rngState: number, phase: number, cupId = NATIONAL_CUP_ID): number {
  return mix32(mix32(rngState, formatOf(cupId).drawSalt), phase);
}

/** Who enters the draw of phase `k`, in seeding order (AC 8, AC 9). */
function qualified(cup: Cup, k: number): string[] {
  const rank = new Map(cup.seeding.map((id, i) => [id, i]));
  const bySeed = (ids: string[]) => ids.sort((a, b) => rank.get(a)! - rank.get(b)!);
  const preliminary = formatOf(cup.id).preliminary;
  if (k === 0) return preliminary ? cup.seeding.slice(-preliminary) : [...cup.seeding];
  const winners = cup.phases[k - 1]!.ties.map((t) => t.winnerId).filter((id): id is string => !!id);
  if (k === 1 && preliminary) return bySeed([...cup.seeding.slice(0, cup.seeding.length - preliminary), ...winners]);
  return bySeed(winners);
}

/**
 * Door 3: shuffles the qualified clubs (Fisher-Yates with `randInt`) and pairs them in order;
 * the club lower in the seeding plays at home (AC 10). A phase is drawn once and never redrawn.
 */
export function drawPhase(cup: Cup, k: number, rngState: number): void {
  const phase = cup.phases[k];
  if (!phase || phase.ties.length) return;
  const clubs = shuffledQualified(cup, k, rngState);
  for (let i = 0; i + 1 < clubs.length; i += 2) addTie(cup, k, clubs[i]!, clubs[i + 1]!);
}

function shuffledQualified(cup: Cup, k: number, rngState: number): string[] {
  const rng = createRng(drawSeed(rngState, k, cup.id));
  const clubs = qualified(cup, k);
  for (let i = clubs.length - 1; i > 0; i--) {
    const j = randInt(rng, 0, i);
    [clubs[i], clubs[j]] = [clubs[j]!, clubs[i]!];
  }
  return clubs;
}

/** AC 10: the club lower in the seeding plays at home. */
function addTie(cup: Cup, k: number, a: string, b: string): void {
  const phase = cup.phases[k]!;
  const [homeId, awayId] = cup.seeding.indexOf(a) > cup.seeding.indexOf(b) ? [a, b] : [b, a];
  phase.ties.push({ id: `${cup.id}-p${k}-m${phase.ties.length}`, homeId, awayId, result: null, penalties: null, winnerId: null });
}

/**
 * Copa-continental AC 6: phase 0 with no tie between two clubs of the same country. The shuffled
 * clubs are paired in turn: the first club of the country with the most clubs left meets the first
 * club left of another country, which always succeeds while no country has more than half.
 */
function drawSeparated(cup: Cup, countryOf: (clubId: string) => Country | undefined, rngState: number): void {
  const left = shuffledQualified(cup, 0, rngState);
  const count = (country: Country | undefined) => left.filter((id) => countryOf(id) === country).length;
  while (left.length > 1) {
    const a = left.reduce((best, id) => (count(countryOf(id)) > count(countryOf(best)) ? id : best));
    left.splice(left.indexOf(a), 1);
    const b = left.find((id) => countryOf(id) !== countryOf(a)) ?? left[0]!;
    left.splice(left.indexOf(b), 1);
    addTie(cup, 0, a, b);
  }
}

function emptyCup(cupId: string, seeding: readonly string[]): Cup {
  const format = formatOf(cupId);
  return {
    id: cupId,
    name: format.name,
    seeding: [...seeding],
    phases: format.phaseNames.map((name, k) => ({ name, afterLeagueRound: format.afterRounds[k]!, ties: [] })),
    currentPhase: 0,
  };
}

/** A season's cup: six phases on the calendar and the preliminary round already drawn (AC 11). */
export function newCup(seeding: string[], rngState: number): Cup {
  const cup = emptyCup(NATIONAL_CUP_ID, seeding);
  drawPhase(cup, 0, rngState);
  return cup;
}

/** Copa-continental AC 1, AC 6: four phases on the calendar and the Oitavas already drawn. */
export function newContinentalCup(seeding: string[], countryOf: (clubId: string) => Country | undefined, rngState: number): Cup {
  const cup = emptyCup(CONTINENTAL_CUP_ID, seeding);
  drawSeparated(cup, countryOf, rngState);
  return cup;
}

/** Each club's country, from the league it plays in. */
export function countryLookup(leagues: readonly League[]): (clubId: string) => Country | undefined {
  const map = new Map(leagues.flatMap((l) => l.clubs.map((c) => [c.id, l.country] as const)));
  return (clubId) => map.get(clubId);
}

/** Copa-continental AC 5: 1º BR, 1º AR, 1º PT, 2º BR, … - each list best first. */
function interleave(byCountry: Readonly<Record<Country, readonly string[]>>): string[] {
  const rows = Math.max(...CONTINENTAL_COUNTRIES.map((c) => CONTINENTAL_PLACES[c]));
  const out: string[] = [];
  for (let i = 0; i < rows; i++) {
    for (const c of CONTINENTAL_COUNTRIES) {
      const id = i < CONTINENTAL_PLACES[c] ? byCountry[c][i] : undefined;
      if (id) out.push(id);
    }
  }
  return out;
}

const firstDivision = <T extends Pick<League, "country" | "tier">>(leagues: readonly T[], country: Country): T | undefined =>
  leagues.find((l) => l.country === country && l.tier === 0);

/** Copa-continental AC 2, AC 24: each country's first division by strength. */
export function continentalByStrength(leagues: readonly League[]): string[] {
  const top = (country: Country) => {
    const league = firstDivision(leagues, country);
    return league ? strengthRanking(league.clubs) : [];
  };
  return interleave({ BR: top("BR"), AR: top("AR"), PT: top("PT") });
}

/**
 * Copa-continental AC 3, AC 4: at the turn of the season, each country's first division by its
 * final table (`tables` by league id, best first), with the national cup's champion first of Brazil.
 */
export function continentalFromTables(
  leagues: readonly Pick<League, "id" | "country" | "tier">[],
  tables: ReadonlyMap<string, readonly string[]>,
  nationalChampion: string | null,
): string[] {
  const table = (country: Country) => {
    const league = firstDivision(leagues, country);
    return league ? (tables.get(league.id) ?? []) : [];
  };
  const brazil = nationalChampion ? [nationalChampion, ...table("BR").filter((id) => id !== nationalChampion)] : table("BR");
  return interleave({ BR: brazil, AR: table("AR"), PT: table("PT") });
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
    ...makeMatch(tie.id, side(tie.homeId), side(tie.awayId), cupMatchSeed(rngState, cup.currentPhase, i, cup.id), cup.id),
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
  // Carreira-dinamica AC 19: playing the next date turns the offer down.
  if (state.pendingJob?.reason === "offer") delete state.pendingJob;
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
        cupPrize: clubId === tie.winnerId ? formatOf(cup.id).prizes[k]! : 0,
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

/**
 * AC 36: the last phase the club played (0 = the first phase), one past the final for the champion
 * (6 in the national cup, 4 in the continental); null when it never played.
 */
export function cupReached(cup: Cup, clubId: string): number | null {
  if (cupChampion(cup) === clubId) return cup.phases.length;
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
