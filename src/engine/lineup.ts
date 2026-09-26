import type { Club, FormationName, Lineup, Player, PlayerCore, Position, Posture } from "./types";

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

/** Not injured and not suspended (AC 29, AC 34). Players without condition data are available. */
export function isAvailable(player: PlayerCore & { injuryRounds?: number; suspendedRounds?: number }): boolean {
  return (player.injuryRounds ?? 0) === 0 && (player.suspendedRounds ?? 0) === 0;
}

function byRatingDesc(a: Player, b: Player): number {
  return b.rating - a.rating || a.id.localeCompare(b.id);
}

/**
 * Best available player per slot: the highest-rated available player of the slot's position;
 * when none is left, the highest-rated available player of any position (out of position).
 */
export function autoLineup(
  club: Club,
  formation: FormationName,
  posture: Posture = club.lineup?.posture ?? "balanced",
  restBelow = 0,
): Lineup {
  const used = new Set<string>();
  // Players at or above `restBelow` fitness come first, so a tired one starts only when no rested one fits the slot.
  const rested = (p: Player) => (p.fitness >= restBelow ? 0 : 1);
  const available = club.players.filter(isAvailable).sort((a, b) => rested(a) - rested(b) || byRatingDesc(a, b));
  const slots = formationSlots(formation);
  const starters: (string | null)[] = slots.map((position) => {
    const best = available.find((p) => p.position === position && !used.has(p.id));
    if (!best) return null;
    used.add(best.id);
    return best.id;
  });
  slots.forEach((_, i) => {
    if (starters[i]) return;
    const any = available.find((p) => !used.has(p.id));
    if (!any) return;
    used.add(any.id);
    starters[i] = any.id;
  });
  return { formation, starters, posture };
}

/** Any available player may take any slot; out of position costs 25% of their strength (door 6). */
export function canAssign(slotPosition: Position, player: Player): boolean {
  void slotPosition;
  return isAvailable(player);
}

/**
 * Put `playerId` in `slotIndex`. Returns null when the player is unavailable or unknown.
 * A player already in another slot is moved, leaving that slot empty.
 */
export function assignSlot(club: Club, lineup: Lineup, slotIndex: number, playerId: string): Lineup | null {
  const slots = formationSlots(lineup.formation);
  const slotPosition = slots[slotIndex];
  const player = club.players.find((p) => p.id === playerId);
  if (!slotPosition || !player || !canAssign(slotPosition, player)) return null;
  const starters = lineup.starters.map((id) => (id === playerId ? null : id));
  starters[slotIndex] = playerId;
  return { formation: lineup.formation, starters, posture: lineup.posture };
}

export interface LineupValidation {
  ok: boolean;
  /** How many slots still need a valid, distinct, available starter. */
  missing: number;
}

/** Valid = 11 distinct available players of the club, one per slot, in any position. */
export function validateLineup(club: Club, lineup: Lineup | null): LineupValidation {
  if (!lineup) return { ok: false, missing: 11 };
  const slots = formationSlots(lineup.formation);
  const seen = new Set<string>();
  let valid = 0;
  slots.forEach((_, i) => {
    const id = lineup.starters[i];
    if (!id || seen.has(id)) return;
    const player = club.players.find((p) => p.id === id);
    if (!player || !isAvailable(player)) return;
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
