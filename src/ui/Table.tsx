import { useState } from "react";
import { DIVISION_LABEL, divisionOf } from "../engine/board";
import { computeTable } from "../engine/table";
import type { GameState, League } from "../engine/types";
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
                    <Flag clubId={row.clubId} name={row.name} size={14} />
                    <span className="club-name-text">{row.name}</span>
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

/** AC 5: the user's division by default, with a «Divisão» selector for the other one. */
export function DivisionTable({ game, highlightClubId }: { game: GameState; highlightClubId: string | null }) {
  const own = Math.max(0, highlightClubId ? divisionOf(game, highlightClubId) : 0);
  const [division, setDivision] = useState(own);
  const league = game.leagues[division] ?? game.leagues[0]!;
  return (
    <>
      <label className="formation-row division-select">
        Divisão
        <select aria-label="Divisão" value={division} onChange={(e) => setDivision(Number(e.target.value))}>
          {game.leagues.map((l, i) => (
            <option key={l.id} value={i}>
              {DIVISION_LABEL[i] ?? l.name}
            </option>
          ))}
        </select>
      </label>
      <Table league={league} highlightClubId={highlightClubId} />
    </>
  );
}
