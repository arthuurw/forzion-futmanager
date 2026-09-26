import { computeTable } from "../engine/table";
import type { League } from "../engine/types";
import { Flag } from "./Flag";

const COLUMNS = ["P", "J", "V", "E", "D", "GP", "GC", "SG"] as const;

/** AC 25: the classification. */
export function Table({ league, highlightClubId }: { league: League; highlightClubId: string | null }) {
  const rows = computeTable(league);
  return (
    <div className="table-wrap">
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
          {rows.map((row, i) => {
            const classes = [i === 0 ? "first" : "", row.clubId === highlightClubId ? "me" : ""].filter(Boolean).join(" ");
            return (
              <tr key={row.clubId} className={classes || undefined}>
                <td className="rank">
                  <span className="rank-box">{i + 1}</span>
                </td>
                <td className="club-cell">
                  <span className="club-inline">
                    <Flag clubId={row.clubId} size={14} />
                    {row.name}
                  </span>
                </td>
                {COLUMNS.map((c) => (
                  <td key={c} className={c === "P" ? "num pts" : "num"}>
                    {row[c]}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
