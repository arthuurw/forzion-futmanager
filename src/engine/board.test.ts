import { combinedVerdict, cupGoalLabel, cupGoalMet, divisionAt, goalLabel, jobOffers, userBoardGoal, userCupGoal, verdictFor } from "./board";
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

describe("diretoria nos países (paises)", () => {
  const setRating = (club: Club, rating: number) => club.players.forEach((p) => (p.rating = rating));

  test("meta em liga sem rebaixamento", () => {
    // C13 (AC 13): min(20, rank + 3), label «até o Nº», by the rank in the league's strength ranking.
    const rows: [number, number, string][] = [
      [1, 4, "até o 4º"],
      [10, 13, "até o 13º"],
      [17, 20, "até o 20º"],
      [20, 20, "até o 20º"],
    ];
    for (const k of [2, 3]) {
      const s = newGame(71);
      const clubs = s.leagues[k]!.clubs;
      clubs.forEach((c, i) => setRating(c, 90 - i));
      for (const [rank, goal, label] of rows) {
        s.userClubId = clubs[rank - 1]!.id;
        expect(userBoardGoal(s), `${s.leagues[k]!.id} posto ${rank}`).toBe(goal);
        expect(goalLabel(divisionAt(s.leagues, k), goal), `${s.leagues[k]!.id} posto ${rank}`).toBe(label);
      }
    }
  });

  test("veredito em liga sem rebaixamento", () => {
    // C14 (AC 14, L-007): only 5 or more places below the goal fires; the Série A contrasts.
    const leagues = newGame(72).leagues;
    const rows: [number, number, number, Verdict][] = [
      [2, 16, 16, "met"],
      [2, 16, 17, "missed"],
      [2, 16, 20, "missed"],
      [3, 16, 16, "met"],
      [3, 16, 17, "missed"],
      [3, 16, 20, "missed"],
      [0, 16, 17, "fired"],
      [2, 8, 13, "fired"],
      [2, 8, 12, "missed"],
      [3, 8, 13, "fired"],
      [3, 8, 12, "missed"],
    ];
    for (const [k, goal, position, verdict] of rows) {
      expect(verdictFor(divisionAt(leagues, k), goal, position), `liga ${k} meta ${goal} posição ${position}`).toBe(verdict);
    }
  });

  test("propostas de emprego de qualquer país", () => {
    // C15 (AC 15): the 3 just below in the ranking of all 80 clubs, by the mean of the best 11.
    const s = newGame(73);
    const all = s.leagues.flatMap((l) => l.clubs);
    expect(all).toHaveLength(80);
    const ranking = [...all].sort((a, b) => best11(b) - best11(a) || a.id.localeCompare(b.id)).map((c) => c.id);
    const abroad = (id: string) => Number(id.slice(1)) >= 41;
    let fromAbroad = 0;
    for (let p = 0; p < 77; p++) {
      const offers = jobOffers({ ...s, userClubId: ranking[p]! });
      expect(offers, ranking[p]).toEqual(ranking.slice(p + 1, p + 4));
      if (offers.some(abroad)) fromAbroad++;
    }
    // The 5th strongest of the Liga Portuguesa (plan, independent test).
    const pt = [...s.leagues[3]!.clubs].sort((a, b) => best11(b) - best11(a) || a.id.localeCompare(b.id));
    const fifth = pt[4]!.id;
    const offers = jobOffers({ ...s, userClubId: fifth });
    expect(offers).toHaveLength(3);
    expect(fromAbroad).toBeGreaterThan(0);
    const at = ranking.indexOf(fifth);
    expect(offers).toEqual(ranking.slice(at + 1, at + 4));
  });

  test("meta de copa só com o Brasil", () => {
    // C16 (AC 16, L-018): the rank among the 40 clubs of Brazil, never among the 80.
    const s = newGame(74);
    for (const l of s.leagues.slice(2)) for (const c of l.clubs) setRating(c, 95);
    const brazil = s.leagues.slice(0, 2).flatMap((l) => l.clubs);
    const preliminary = new Set(s.cups[0]!.seeding.slice(-16));
    const rank = (clubs: Club[], id: string) =>
      [...clubs].sort((a, b) => best11(b) - best11(a) || a.id.localeCompare(b.id)).findIndex((c) => c.id === id) + 1;
    const goalOf = (r: number) => (r <= 4 ? 4 : r <= 8 ? 3 : 2);
    const user = brazil.find((c) => !preliminary.has(c.id) && rank(brazil, c.id) === 2)!;
    const among40 = goalOf(rank(brazil, user.id));
    const among80 = goalOf(rank(s.leagues.flatMap((l) => l.clubs), user.id));
    expect(among40).toBe(4);
    expect(among80).not.toBe(among40);
    expect(userCupGoal({ ...s, userClubId: user.id })).toBe(among40);
    for (const l of s.leagues.slice(2)) for (const c of l.clubs) expect(userCupGoal({ ...s, userClubId: c.id }), c.id).toBe(-1);
  });
});
