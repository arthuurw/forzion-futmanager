import { formationSlots } from "./lineup";
import { simulateMatch, type TeamSheet } from "./match";
import { createRng } from "./rng";
import type { Player } from "./types";

function flatSheet(clubId: string, rating: number): TeamSheet {
  const starters: Player[] = formationSlots("4-4-2").map((position, i) => ({
    id: `${clubId}-${i}`,
    name: `${clubId} ${i}`,
    position,
    age: 25,
    rating,
  }));
  return { clubId, starters };
}

function run(homeRating: number, awayRating: number, n = 2000) {
  let goals = 0;
  let homeWins = 0;
  let draws = 0;
  for (let seed = 1; seed <= n; seed++) {
    const { result } = simulateMatch(flatSheet("H", homeRating), flatSheet("A", awayRating), createRng(seed));
    goals += result.homeGoals + result.awayGoals;
    if (result.homeGoals > result.awayGoals) homeWins++;
    else if (result.homeGoals === result.awayGoals) draws++;
  }
  return { meanGoals: goals / n, homeWinRate: homeWins / n, drawRate: draws / n };
}

describe("balanceamento", () => {
  test("times iguais", () => {
    const r = run(70, 70);
    expect(r.meanGoals).toBeGreaterThanOrEqual(2.3);
    expect(r.meanGoals).toBeLessThanOrEqual(3.1);
    expect(r.homeWinRate).toBeGreaterThanOrEqual(0.4);
    expect(r.homeWinRate).toBeLessThanOrEqual(0.52);
  });

  test("forte contra fraco", () => {
    const r = run(85, 55);
    expect(r.homeWinRate).toBeGreaterThanOrEqual(0.75);
  });
});
