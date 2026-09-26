import type { League } from "./types";

export interface TableRow {
  clubId: string;
  name: string;
  P: number;
  J: number;
  V: number;
  E: number;
  D: number;
  GP: number;
  GC: number;
  SG: number;
}

/** Classification: P, V, SG, GP descending, then name ascending (AC 25). */
export function compareRows(a: TableRow, b: TableRow): number {
  return b.P - a.P || b.V - a.V || b.SG - a.SG || b.GP - a.GP || a.name.localeCompare(b.name, "pt-BR");
}

export function computeTable(league: League): TableRow[] {
  const rows = new Map<string, TableRow>();
  for (const club of league.clubs) {
    rows.set(club.id, { clubId: club.id, name: club.name, P: 0, J: 0, V: 0, E: 0, D: 0, GP: 0, GC: 0, SG: 0 });
  }
  const apply = (clubId: string, scored: number, conceded: number) => {
    const row = rows.get(clubId);
    if (!row) return;
    row.J++;
    row.GP += scored;
    row.GC += conceded;
    row.SG = row.GP - row.GC;
    if (scored > conceded) {
      row.V++;
      row.P += 3;
    } else if (scored === conceded) {
      row.E++;
      row.P += 1;
    } else {
      row.D++;
    }
  };
  for (const round of league.rounds) {
    for (const match of round.matches) {
      if (!match.result) continue;
      apply(match.homeId, match.result.homeGoals, match.result.awayGoals);
      apply(match.awayId, match.result.awayGoals, match.result.homeGoals);
    }
  }
  return [...rows.values()].sort(compareRows);
}
