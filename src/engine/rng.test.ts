import { createRng } from "./rng";

describe("Rng (door 2)", () => {
  test("mesma seed mesma sequência", () => {
    const a = createRng(123);
    const b = createRng(123);
    const seqA = Array.from({ length: 1000 }, () => a.next());
    const seqB = Array.from({ length: 1000 }, () => b.next());
    expect(seqA).toEqual(seqB);
    for (const v of seqA) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
    const other = createRng(124);
    expect(Array.from({ length: 10 }, () => other.next())).not.toEqual(seqA.slice(0, 10));
  });

  test("getState restaura sequência", () => {
    const a = createRng(99);
    for (let i = 0; i < 500; i++) a.next();
    const state = a.getState();
    const restored = createRng(state);
    const seqA = Array.from({ length: 200 }, () => a.next());
    const seqR = Array.from({ length: 200 }, () => restored.next());
    expect(seqR).toEqual(seqA);
  });
});
