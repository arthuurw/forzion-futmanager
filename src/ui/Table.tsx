import { computeTable } from "../engine/table";
import type { League } from "../engine/types";

const COLUMNS = ["P", "J", "V", "E", "D", "GP", "GC", "SG"] as const;

/** AC 25: the classification. */
export function Table({ league, highlightClubId }: { league: League; highlightClubId: string | null }) {
  const rows = computeTable(league);
  return (
    <table aria-label="Classificação">
      <thead>
        <tr>
          <th>#</th>
          <th>Clube</th>
          {COLUMNS.map((c) => (
            <th key={c} className="num">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={row.clubId} style={row.clubId === highlightClubId ? { fontWeight: "bold" } : undefined}>
            <td>{i + 1}</td>
            <td>{row.name}</td>
            {COLUMNS.map((c) => (
              <td key={c} className="num">
                {row[c]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
