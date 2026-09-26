export type Position = "GK" | "DF" | "MF" | "FW";
export const POSITIONS: readonly Position[] = ["GK", "DF", "MF", "FW"];

export const RATING_MIN = 40;
export const RATING_MAX = 95;
export const AGE_MIN = 17;
export const AGE_MAX = 36;

/** What a player is, independent of how they feel today. */
export interface PlayerCore {
  id: string;
  name: string;
  position: Position;
  age: number;
  rating: number;
}

/** Door 1 (save v2): how a player is doing. Integers. */
export interface Condition {
  /** 0..100 */
  fitness: number;
  /** -2..2 */
  morale: number;
  /** Rounds still out injured. */
  injuryRounds: number;
  /** Rounds still out suspended. */
  suspendedRounds: number;
  /** Yellow cards accumulated towards a suspension (0..2). */
  yellowCards: number;
  /** Consecutive rounds without playing (door 7). */
  idleRounds: number;
}

/** Door 1 (save v4): games and goals, this season and before it. */
export interface PlayerStats {
  seasonGames: number;
  seasonGoals: number;
  /** Seasons already closed; the current season is not in here yet. */
  careerGames: number;
  careerGoals: number;
}

export const ZERO_STATS: Readonly<PlayerStats> = { seasonGames: 0, seasonGoals: 0, careerGames: 0, careerGoals: 0 };

export interface Player extends PlayerCore, Condition, PlayerStats {
  /** Reais per round, fixed when the player is generated or joins a club; never derived from rating (door 2). */
  salary: number;
  /** Seasons left, counting the current one. At least 1 while at a club; 0 for free agents and juniors (door 1). */
  contractSeasons: number;
}

export const FRESH_CONDITION: Readonly<Condition> = {
  fitness: 100,
  morale: 0,
  injuryRounds: 0,
  suspendedRounds: 0,
  yellowCards: 0,
  idleRounds: 0,
};

export type FormationName = "4-4-2" | "4-3-3" | "3-5-2" | "4-5-1";
export const FORMATION_NAMES: readonly FormationName[] = ["4-4-2", "4-3-3", "3-5-2", "4-5-1"];

export type Posture = "defensive" | "balanced" | "attacking";
export const POSTURES: readonly Posture[] = ["defensive", "balanced", "attacking"];

/** Eleven slots in formation order (GK, then DF, MF, FW). `null` = empty slot. */
export interface Lineup {
  formation: FormationName;
  starters: (string | null)[];
  posture: Posture;
}

/** What a club earned and spent when the last round closed. Reais. */
export interface Ledger {
  /** 0 when the club played away. */
  attendance: number;
  tickets: number;
  sponsorship: number;
  salaries: number;
  interest: number;
  /** Money received from sales since the previous close. */
  transfersIn: number;
  /** Money paid for purchases, sign-on fees and releases since the previous close. */
  transfersOut: number;
  /** End-of-season prize by table position; only on the ledger of the last round (AC 29). */
  prize?: number;
}

/** Door 1 (save v3): a club's money and stadium. Every amount is an integer in reais (AD-006). */
export interface Finance {
  cash: number;
  sponsorship: number;
  fans: number;
  capacity: number;
  ticketPrice: number;
  /** Rounds until the stadium expansion is ready; 0 = no works. */
  expansionRoundsLeft: number;
  /** Outstanding bank loan. */
  loan: number;
  loanLimit: number;
  pendingIn: number;
  pendingOut: number;
  lastRound: Ledger | null;
}

export interface Club {
  id: string;
  name: string;
  players: Player[];
  lineup: Lineup | null;
  finance: Finance;
  /** Ids of the players the user put up for sale. */
  forSale: string[];
}

export interface Goal {
  minute: number;
  clubId: string;
  playerId: string;
}

/** Door 7 of the core: only the score and the goals are persisted, never the full event log. */
export interface MatchResult {
  homeGoals: number;
  awayGoals: number;
  goals: Goal[];
}

export interface Match {
  id: string;
  homeId: string;
  awayId: string;
  result: MatchResult | null;
}

export interface Round {
  number: number;
  matches: Match[];
}

export interface League {
  id: string;
  name: string;
  clubs: Club[];
  rounds: Round[];
  /** Index of the next round to play, 0..rounds.length. Equal to rounds.length = season over. */
  currentRound: number;
}

/** An AI club's bid for one of the user's players, valid until the next round closes. */
export interface Offer {
  id: string;
  buyerId: string;
  playerId: string;
  amount: number;
}

/** Players with no club, kept outside the leagues so they can cross countries later (door 1). */
export interface Market {
  freeAgents: Player[];
  juniors: Player[];
  offers: Offer[];
}

export const SCHEMA_VERSION = 4 as const;

export type Verdict = "met" | "missed" | "fired";

/** One division's season, kept by name where players may retire and vanish (door 1). */
export interface DivisionRecord {
  leagueId: string;
  championId: string;
  promotedIds: string[];
  relegatedIds: string[];
  topScorer: { name: string; clubName: string; goals: number } | null;
}

/** Door 1: one entry per closed season, never rewritten. */
export interface SeasonRecord {
  season: number;
  userClubId: string | null;
  userLeagueId: string | null;
  userPosition: number | null;
  verdict: Verdict | null;
  prize: number;
  divisions: DivisionRecord[];
}

/** Door 1: the whole save document. */
export interface GameState {
  schemaVersion: typeof SCHEMA_VERSION;
  seed: number;
  rngState: number;
  season: number;
  userClubId: string | null;
  /** Door 4: `leagues[0]` is the Série A and `leagues[1]` the Série B. */
  leagues: League[];
  market: Market;
  history: SeasonRecord[];
  /** Worst acceptable final position for the user this season; 0 before a club is chosen (AC 30). */
  boardGoal: number;
}

export type MatchEventType =
  | "kickoff"
  | "shot_saved"
  | "shot_missed"
  | "goal"
  | "halftime"
  | "fulltime"
  | "yellow"
  | "red"
  | "injury"
  | "substitution";

export const MATCH_EVENT_TYPES: readonly MatchEventType[] = [
  "kickoff",
  "shot_saved",
  "shot_missed",
  "goal",
  "halftime",
  "fulltime",
  "yellow",
  "red",
  "injury",
  "substitution",
];

export interface MatchEvent {
  minute: number;
  type: MatchEventType;
  clubId: string;
  /** The player the event is about; for a substitution, the one leaving. */
  playerId?: string;
  /** Substitution only: the one coming on. */
  playerInId?: string;
}
