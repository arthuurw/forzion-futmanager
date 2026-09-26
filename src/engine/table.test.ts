import { compareRows, computeTable, type TableRow } from "./table";
import type { League } from "./types";

function row(name: string, over: Partial<TableRow>): TableRow {
  return { clubId: name, name, P: 0, J: 0, V: 0, E: 0, D: 0, GP: 0, GC: 0, SG: 0, ...over };
}

function miniLeague(results: [string, string, number, number][]): League {
  const ids = ["Alfa", "Beta", "Gama", "Delta"];
  return {
    id: "l",
    name: "mini",
    clubs: ids.map((id) => ({ id, name: id, players: [], lineup: null })),
    rounds: [
      {
        number: 1,
        matches: results.map(([h, a, hg, ag], i) => ({
          id: `m${i}`,
          homeId: h,
          awayId: a,
          result: { homeGoals: hg, awayGoals: ag, goals: [] },
        })),
      },
    ],
    currentRound: 1,
  };
}

describe("tabela", () => {
  test("pontos e desempate", () => {
    // Points: win 3, draw 1, loss 0; columns computed from results.
    const table = computeTable(miniLeague([["Alfa", "Beta", 2, 0], ["Gama", "Delta", 1, 1]]));
    expect(table.map((r) => [r.name, r.P, r.J, r.V, r.E, r.D, r.GP, r.GC, r.SG])).toEqual([
      ["Alfa", 3, 1, 1, 0, 0, 2, 0, 2],
      ["Delta", 1, 1, 0, 1, 0, 1, 1, 0],
      ["Gama", 1, 1, 0, 1, 0, 1, 1, 0],
      ["Beta", 0, 1, 0, 0, 1, 0, 2, -2],
    ]);
    // One case per tie-break criterion: P, V, SG, GP, name.
    const cases: [string, TableRow, TableRow][] = [
      ["P", row("x", { P: 4 }), row("y", { P: 3, V: 1 })],
      ["V", row("x", { P: 3, V: 1 }), row("y", { P: 3, V: 0, SG: 5 })],
      ["SG", row("x", { P: 3, V: 1, SG: 1 }), row("y", { P: 3, V: 1, SG: 0, GP: 9 })],
      ["GP", row("x", { P: 3, V: 1, SG: 1, GP: 3 }), row("y", { P: 3, V: 1, SG: 1, GP: 2 })],
      ["nome", row("Ana", { P: 3, V: 1, SG: 1, GP: 3 }), row("Bia", { P: 3, V: 1, SG: 1, GP: 3 })],
    ];
    for (const [label, first, second] of cases) {
      expect(compareRows(first, second), label).toBeLessThan(0);
      expect(compareRows(second, first), label).toBeGreaterThan(0);
    }
    // Unplayed matches count for nothing.
    const league = miniLeague([["Alfa", "Beta", 2, 0]]);
    league.rounds[0]!.matches.push({ id: "x", homeId: "Gama", awayId: "Delta", result: null });
    expect(computeTable(league).find((r) => r.name === "Gama")!.J).toBe(0);
  });
});
