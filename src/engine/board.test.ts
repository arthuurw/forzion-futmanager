import { combinedVerdict, cupGoalLabel, cupGoalMet, userCupGoal } from "./board";
import { cupReached } from "./cup";
import { newGame } from "./generate";
import type { Club, Cup, Tie, Verdict } from "./types";

const best11 = (c: Club) => [...c.players].map((p) => p.rating).sort((a, b) => b - a).slice(0, 11).reduce((a, b) => a + b, 0) / 11;

/** A hand-built cup: `ties[k]` are phase k's ties as [home, away, winner]. */
function cupWith(ties: [string, string, string][][]): Cup {
  const names = ["Preliminar", "16 avos", "Oitavas", "Quartas", "Semifinal", "Final"];
  return {
    id: "cup-nat",
    name: "Copa Nacional",
    seeding: [],
    currentPhase: ties.length,
    phases: names.map((name, k) => ({
      name,
      afterLeagueRound: [4, 10, 16, 22, 28, 34][k]!,
      ties: (ties[k] ?? []).map(
        ([homeId, awayId, winnerId], i): Tie => ({
          id: `cup-nat-p${k}-m${i}`,
          homeId,
          awayId,
          result: { homeGoals: winnerId === homeId ? 1 : 0, awayGoals: winnerId === awayId ? 1 : 0, goals: [] },
          penalties: null,
          winnerId,
        }),
      ),
    })),
  };
}

describe("meta de copa", () => {
  test("meta de copa pelos 40 clubes", () => {
    const s = newGame(91);
    // Paises: the 40 clubs of Brazil (a club abroad has no cup goal, C16).
    const clubs = s.leagues.filter((l) => l.country === "BR").flatMap((l) => l.clubs);
    const preliminary = new Set(s.cups[0]!.phases[0]!.ties.flatMap((t) => [t.homeId, t.awayId]));
    expect(preliminary.size).toBe(16);
    const ranking = [...clubs].sort((a, b) => best11(b) - best11(a) || a.id.localeCompare(b.id)).map((c) => c.id);
    const seen = new Map<number, number>();
    for (const c of clubs) {
      const rank = ranking.indexOf(c.id) + 1;
      const expected = preliminary.has(c.id) ? 1 : rank <= 4 ? 4 : rank <= 8 ? 3 : 2;
      const goal = userCupGoal({ ...s, userClubId: c.id });
      expect(goal, `${c.id} (posição ${rank})`).toBe(expected);
      seen.set(goal, (seen.get(goal) ?? 0) + 1);
    }
    expect(clubs).toHaveLength(40);
    expect([...seen.keys()].sort()).toEqual([1, 2, 3, 4]);
    expect(userCupGoal({ ...s, userClubId: null })).toBe(-1);
  });

  test("fase alcançada e meta cumprida", () => {
    // «u» goes out in the preliminary; «v» in the round of 16 (phase 2); «w» loses the final; «x» wins it.
    const cup = cupWith([
      [["u", "a", "a"]],
      [["v", "b", "v"]],
      [["v", "c", "c"], ["w", "d", "w"], ["x", "e", "x"]],
      [["w", "f", "w"], ["x", "g", "x"]],
      [["w", "h", "w"], ["x", "i", "x"]],
      [["w", "x", "x"]],
    ]);
    const table: [string, number][] = [
      ["u", 0],
      ["v", 2],
      ["w", 5],
      ["x", 6],
    ];
    for (const [club, reached] of table) expect(cupReached(cup, club), club).toBe(reached);
    expect(cupGoalMet(2, 2)).toBe(true);
    expect(cupGoalMet(2, 6)).toBe(true);
    expect(cupGoalMet(3, 2)).toBe(false);
    expect(cupGoalMet(1, 0)).toBe(false);
  });

  test("veredito combinado", () => {
    const met = { goal: 2, reached: 3 };
    const missed = { goal: 2, reached: 1 };
    const none = { goal: -1, reached: 6 };
    const table: [Verdict, typeof met, Verdict][] = [
      ["met", met, "met"],
      ["met", missed, "missed"],
      ["met", none, "met"],
      ["missed", met, "met"],
      ["missed", missed, "missed"],
      ["missed", none, "missed"],
      ["fired", met, "missed"],
      ["fired", missed, "fired"],
      ["fired", none, "fired"],
    ];
    for (const [league, cup, expected] of table) expect(combinedVerdict(league, cup.goal, cup.reached), `${league} ${JSON.stringify(cup)}`).toBe(expected);
  });

  test("rótulos da meta de copa", () => {
    expect([1, 2, 3, 4].map(cupGoalLabel)).toEqual(["chegar aos 16 avos", "chegar às oitavas", "chegar às quartas", "chegar à semifinal"]);
  });
});
