import type { Club, FormationName, Lineup, Player, Position } from "./types";

export const FORMATIONS: Record<FormationName, { DF: number; MF: number; FW: number }> = {
  "4-4-2": { DF: 4, MF: 4, FW: 2 },
  "4-3-3": { DF: 4, MF: 3, FW: 3 },
  "3-5-2": { DF: 3, MF: 5, FW: 2 },
  "4-5-1": { DF: 4, MF: 5, FW: 1 },
};

export const AI_FORMATION: FormationName = "4-4-2";

/** The eleven slot positions of a formation, in order: GK, DFs, MFs, FWs. */
export function formationSlots(formation: FormationName): Position[] {
  const f = FORMATIONS[formation];
  return [
    "GK",
    ...Array<Position>(f.DF).fill("DF"),
    ...Array<Position>(f.MF).fill("MF"),
    ...Array<Position>(f.FW).fill("FW"),
  ];
}

function byRatingDesc(a: Player, b: Player): number {
  return b.rating - a.rating || a.id.localeCompare(b.id);
}

/** Best available player per slot: highest rating of the slot's position not yet used. */
export function autoLineup(club: Club, formation: FormationName): Lineup {
  const used = new Set<string>();
  const starters = formationSlots(formation).map((position) => {
    const best = club.players
      .filter((p) => p.position === position && !used.has(p.id))
      .sort(byRatingDesc)[0];
    if (!best) return null;
    used.add(best.id);
    return best.id;
  });
  return { formation, starters };
}

export function canAssign(slotPosition: Position, player: Player): boolean {
  return player.position === slotPosition;
}

/**
 * Put `playerId` in `slotIndex`. Returns null when the player's position does not match the
 * slot. A player already in another slot is moved, leaving that slot empty.
 */
export function assignSlot(club: Club, lineup: Lineup, slotIndex: number, playerId: string): Lineup | null {
  const slots = formationSlots(lineup.formation);
  const slotPosition = slots[slotIndex];
  const player = club.players.find((p) => p.id === playerId);
  if (!slotPosition || !player || !canAssign(slotPosition, player)) return null;
  const starters = lineup.starters.map((id) => (id === playerId ? null : id));
  starters[slotIndex] = playerId;
  return { formation: lineup.formation, starters };
}

export interface LineupValidation {
  ok: boolean;
  /** How many slots still need a valid, distinct starter. */
  missing: number;
}

/** Valid = 11 distinct players, each in a slot of their own position (which implies the formation's counts). */
export function validateLineup(club: Club, lineup: Lineup | null): LineupValidation {
  if (!lineup) return { ok: false, missing: 11 };
  const slots = formationSlots(lineup.formation);
  const seen = new Set<string>();
  let valid = 0;
  slots.forEach((position, i) => {
    const id = lineup.starters[i];
    if (!id || seen.has(id)) return;
    const player = club.players.find((p) => p.id === id);
    if (!player || player.position !== position) return;
    seen.add(id);
    valid++;
  });
  return { ok: valid === 11, missing: 11 - valid };
}

/** Mean rating of the club's eleven highest-rated players, regardless of position (AC 3, AC 7). */
export function bestElevenMean(club: Club): number {
  const top = club.players
    .map((p) => p.rating)
    .sort((a, b) => b - a)
    .slice(0, 11);
  return top.reduce((a, b) => a + b, 0) / Math.max(1, top.length);
}

export function starters(club: Club, lineup: Lineup): Player[] {
  return lineup.starters.flatMap((id) => {
    const p = id ? club.players.find((x) => x.id === id) : undefined;
    return p ? [p] : [];
  });
}
