export type Position = "GK" | "DF" | "MF" | "FW";
export const POSITIONS: readonly Position[] = ["GK", "DF", "MF", "FW"];

export const RATING_MIN = 40;
export const RATING_MAX = 95;
export const AGE_MIN = 17;
export const AGE_MAX = 36;

export interface Player {
  id: string;
  name: string;
  position: Position;
  age: number;
  rating: number;
}

export type FormationName = "4-4-2" | "4-3-3" | "3-5-2" | "4-5-1";
export const FORMATION_NAMES: readonly FormationName[] = ["4-4-2", "4-3-3", "3-5-2", "4-5-1"];

/** Eleven slots in formation order (GK, then DF, MF, FW). `null` = empty slot. */
export interface Lineup {
  formation: FormationName;
  starters: (string | null)[];
}

export interface Club {
  id: string;
  name: string;
  players: Player[];
  lineup: Lineup | null;
}

export interface Goal {
  minute: number;
  clubId: string;
  playerId: string;
}

/** Door 7: only the score and the goals are persisted, never the full event log. */
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

export const SCHEMA_VERSION = 1 as const;

/** Door 1: the whole save document. */
export interface GameState {
  schemaVersion: typeof SCHEMA_VERSION;
  seed: number;
  rngState: number;
  season: number;
  userClubId: string | null;
  leagues: League[];
}

export type MatchEventType = "kickoff" | "shot_saved" | "shot_missed" | "goal" | "halftime" | "fulltime";
export const MATCH_EVENT_TYPES: readonly MatchEventType[] = [
  "kickoff",
  "shot_saved",
  "shot_missed",
  "goal",
  "halftime",
  "fulltime",
];

export interface MatchEvent {
  minute: number;
  type: MatchEventType;
  clubId: string;
  playerId?: string;
}
