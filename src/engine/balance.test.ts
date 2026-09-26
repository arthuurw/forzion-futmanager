import { newGame } from "./generate";
import { formationSlots } from "./lineup";
import { simulateMatch, type TeamSheet } from "./match";
import { createRng } from "./rng";
import { playRound } from "./season";
import type { PlayerCore, Posture } from "./types";

function flatSheet(clubId: string, rating: number, posture: Posture = "balanced"): TeamSheet {
  const starters: PlayerCore[] = formationSlots("4-4-2").map((position, i) => ({
    id: `${clubId}-${i}`,
    name: `${clubId} ${i}`,
    position,
    age: 25,
    rating,
  }));
  return { clubId, starters, posture };
}

/** Per-match means over seeds 1..n: shots and goals by side, cards and injuries. */
function tally(home: TeamSheet, away: TeamSheet, n = 2000) {
  const t = { homeShots: 0, awayShots: 0, homeConceded: 0, yellows: 0, reds: 0, injuries: 0 };
  for (let seed = 1; seed <= n; seed++) {
    const { result, events } = simulateMatch(home, away, createRng(seed));
    t.homeConceded += result.awayGoals;
    for (const e of events) {
      const shot = e.type === "goal" || e.type === "shot_saved" || e.type === "shot_missed";
      if (shot && e.clubId === home.clubId) t.homeShots++;
      if (shot && e.clubId === away.clubId) t.awayShots++;
      if (e.type === "yellow") t.yellows++;
      if (e.type === "red") t.reds++;
      if (e.type === "injury") t.injuries++;
    }
  }
  return Object.fromEntries(Object.entries(t).map(([k, v]) => [k, v / n])) as typeof t;
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

  test("postura ofensiva cria e sofre mais finalizações", () => {
    const balanced = tally(flatSheet("H", 70), flatSheet("A", 70));
    const attacking = tally(flatSheet("H", 70, "attacking"), flatSheet("A", 70));
    expect(attacking.homeShots).toBeGreaterThanOrEqual(balanced.homeShots * 1.15);
    expect(attacking.awayShots).toBeGreaterThan(balanced.awayShots);
  });

  test("postura defensiva sofre menos gols", () => {
    const balanced = tally(flatSheet("H", 70), flatSheet("A", 70));
    const defensive = tally(flatSheet("H", 70, "defensive"), flatSheet("A", 70));
    expect(defensive.homeConceded).toBeLessThanOrEqual(balanced.homeConceded * 0.85);
  });

  test("taxa de cartões", () => {
    const t = tally(flatSheet("H", 70), flatSheet("A", 70));
    expect(t.yellows).toBeGreaterThanOrEqual(3.0);
    expect(t.yellows).toBeLessThanOrEqual(5.5);
    expect(t.reds).toBeGreaterThanOrEqual(0.08);
    expect(t.reds).toBeLessThanOrEqual(0.3);
  });

  test("taxa de lesões", () => {
    const t = tally(flatSheet("H", 70), flatSheet("A", 70));
    expect(t.injuries).toBeGreaterThanOrEqual(0.1);
    expect(t.injuries).toBeLessThanOrEqual(0.4);
  });
});

describe("equilíbrio financeiro", () => {
  test("caixa equilibrado em uma temporada", () => {
    const ratios: number[] = [];
    for (let seed = 1; seed <= 5; seed++) {
      let state = newGame(seed);
      const initial = new Map(state.leagues[0]!.clubs.map((c) => [c.id, c.finance.cash]));
      for (let r = 0; r < 38; r++) state = playRound(state).state;
      for (const c of state.leagues[0]!.clubs) ratios.push(c.finance.cash / initial.get(c.id)!);
    }
    expect(ratios).toHaveLength(100);
    for (const r of ratios) {
      expect(r).toBeGreaterThanOrEqual(0.5);
      expect(r).toBeLessThanOrEqual(2.5);
    }
    const sorted = [...ratios].sort((a, b) => a - b);
    const median = (sorted[49]! + sorted[50]!) / 2;
    expect(median).toBeGreaterThanOrEqual(0.9);
    expect(median).toBeLessThanOrEqual(1.6);
  });
});
