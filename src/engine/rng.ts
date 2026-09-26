/** Door 2: deterministic RNG. mulberry32 - 32-bit state, [0, 1) output. */
export interface Rng {
  next(): number;
  getState(): number;
}

export function createRng(state: number): Rng {
  let a = state >>> 0;
  return {
    next() {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    getState() {
      return a;
    },
  };
}

/** Integer in [min, max], inclusive. */
export function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng.next() * (max - min + 1));
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  const item = items[Math.floor(rng.next() * items.length)];
  if (item === undefined) throw new Error("pick from empty list");
  return item;
}

/** Fisher-Yates, returns a new array. */
export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    const a = out[i] as T;
    out[i] = out[j] as T;
    out[j] = a;
  }
  return out;
}

/** Roughly bell-shaped in [-1, 1] (mean of three uniforms, recentred). */
export function bell(rng: Rng): number {
  return (rng.next() + rng.next() + rng.next()) / 1.5 - 1;
}

/** Deterministic 32-bit mix of two integers (door 2: one seed per match, derived from the save's state). */
export function mix32(a: number, b: number): number {
  let h = (a ^ Math.imul((b + 0x9e3779b9) >>> 0, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return (h ^ (h >>> 16)) >>> 0;
}
