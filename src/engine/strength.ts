import type { Condition, PlayerCore, Position } from "./types";

/** Door 6 of partida-ao-vivo. */
export const OUT_OF_POSITION_FACTOR = 0.75;
export const MORALE_STEP = 0.03;

/**
 * Effective strength of a player in a slot:
 * rating × (0.7 + 0.3 × fitness/100) × (1 + 0.03 × morale) × (out of position ? 0.75 : 1).
 * Missing condition fields count as fresh (fitness 100, morale 0).
 */
export function effectiveRating(player: PlayerCore & Partial<Condition>, slot: Position, fitness = player.fitness ?? 100): number {
  const morale = player.morale ?? 0;
  const positionFactor = player.position === slot ? 1 : OUT_OF_POSITION_FACTOR;
  return player.rating * (0.7 + (0.3 * fitness) / 100) * (1 + MORALE_STEP * morale) * positionFactor;
}
