import type { Difficulty, GameState } from "./types";

/**
 * Door 1 (dificuldade, AD-029): what each level changes. The save keeps the level's name, never
 * these numbers. `cash` multiplies the chosen club's starting cash; `goalMargin` is how many places
 * below its strength rank the board accepts; `aiBuyChance` is each AI club's chance to try a
 * purchase in a window round.
 */
export const DIFFICULTY: Readonly<Record<Difficulty, { cash: number; goalMargin: number; aiBuyChance: number }>> = {
  easy: { cash: 2, goalMargin: 5, aiBuyChance: 0.15 },
  normal: { cash: 1, goalMargin: 3, aiBuyChance: 0.25 },
  hard: { cash: 0.5, goalMargin: 1, aiBuyChance: 0.35 },
};

/** A save from before the levels plays as Normal. */
export function difficultyOf(state: Pick<GameState, "difficulty">): (typeof DIFFICULTY)[Difficulty] {
  return DIFFICULTY[state.difficulty ?? "normal"];
}
