import { useState } from "react";
import { formationSlots, validateLineup } from "../engine/lineup";
import { userLeague } from "../engine/season";
import { FORMATION_NAMES, POSITIONS, type FormationName, type Position } from "../engine/types";
import { useGame, userClub } from "../store";
import { Flag } from "./Flag";
import { RatingBar } from "./RatingBar";
import { Table } from "./Table";

export const POSITION_LABEL: Record<Position, string> = { GK: "GOL", DF: "ZAG", MF: "MEI", FW: "ATA" };

/** Vertical position of each line on the pitch, attack at the top. */
const LINE_Y: Record<Position, number> = { FW: 17, MF: 44, DF: 70, GK: 89 };

/**
 * Pitch coordinates (percent) for each slot of a formation, spread evenly along its line.
 * `w` is the token width, narrowed on crowded lines so neighbours never overlap.
 */
function slotCoordinates(slots: Position[]): { x: number; y: number; w: number }[] {
  const perLine = new Map<Position, number[]>();
  slots.forEach((pos, i) => perLine.set(pos, [...(perLine.get(pos) ?? []), i]));
  const coords: { x: number; y: number; w: number }[] = [];
  for (const [pos, indexes] of perLine) {
    const n = indexes.length;
    const w = Math.min(26, 100 / (n + 1) - 1.5);
    indexes.forEach((slotIndex, k) => {
      coords[slotIndex] = { x: ((k + 1) / (n + 1)) * 100, y: LINE_Y[pos], w };
    });
  }
  return coords;
}

export function Squad() {
  const game = useGame((s) => s.game);
  const setFormation = useGame((s) => s.setFormation);
  const assignStarter = useGame((s) => s.assignStarter);
  const playRound = useGame((s) => s.playRound);
  const [showTable, setShowTable] = useState(false);
  if (!game) return null;
  const club = userClub(game);
  if (!club) return null;
  const league = userLeague(game);
  const lineup = club.lineup;
  const validation = validateLineup(club, lineup);
  const slots = lineup ? formationSlots(lineup.formation) : [];
  const coords = slotCoordinates(slots);
  const starterIds = new Set(lineup?.starters.filter((id): id is string => !!id));

  // AC 9: by position, then rating descending.
  const roster = [...club.players].sort(
    (a, b) => POSITIONS.indexOf(a.position) - POSITIONS.indexOf(b.position) || b.rating - a.rating || a.name.localeCompare(b.name),
  );

  return (
    <>
      <div className="squad-head">
        <h1>
          <Flag clubId={club.id} size={30} />
          {club.name}
        </h1>
        <span className="matchday">
          Rodada {league.currentRound + 1} de {league.rounds.length}
        </span>
      </div>

      <div className="grid-2">
        <section className="panel">
          <h2 className="title-bar">Escalação</h2>
          <label className="formation-row">
            Formação
            <select aria-label="Formação" value={lineup?.formation ?? ""} onChange={(e) => setFormation(e.target.value as FormationName)}>
              {FORMATION_NAMES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>

          <div className="pitch">
            <div className="line halfway" />
            <div className="line circle" />
            <div className="line box" />
            <div className="line small-box" />
            {slots.map((position, i) => {
              const current = lineup?.starters[i] ?? "";
              const options = club.players.filter((p) => p.position === position);
              const at = coords[i] ?? { x: 50, y: 50, w: 26 };
              return (
                <div
                  key={i}
                  className={`token pos-${position}${current ? "" : " empty"}`}
                  style={{ left: `${at.x}%`, top: `${at.y}%`, width: `${at.w}%` }}
                >
                  <span className="num" aria-hidden="true">
                    {i + 1}
                  </span>
                  <select aria-label={`Titular ${i + 1} (${POSITION_LABEL[position]})`} value={current} onChange={(e) => assignStarter(i, e.target.value)}>
                    {current === "" && <option value="">—</option>}
                    {options.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.rating})
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>

          {!validation.ok && (
            <p role="status" className="missing">
              Faltam {validation.missing} titulares
            </p>
          )}
          <div className="action-bar">
            <button className="primary" disabled={!validation.ok} onClick={() => void playRound()}>
              Jogar rodada
            </button>
            <button onClick={() => setShowTable((v) => !v)}>{showTable ? "Ocultar tabela" : "Ver tabela"}</button>
          </div>
        </section>

        <section className="panel">
          <h2 className="title-bar">Elenco</h2>
          <div className="table-wrap">
            <table aria-label="Elenco">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Pos</th>
                  <th className="num">Idade</th>
                  <th className="num">Força</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((p) => (
                  <tr key={p.id} className={starterIds.has(p.id) ? "starter" : undefined}>
                    <td>{p.name}</td>
                    <td>
                      <span className={`pos pos-${p.position}`}>{POSITION_LABEL[p.position]}</span>
                    </td>
                    <td className="num">{p.age}</td>
                    <td className="num rating-cell">
                      <RatingBar rating={p.rating} />
                      {p.rating}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {showTable && (
        <section className="panel">
          <h2 className="title-bar">Classificação</h2>
          <Table league={league} highlightClubId={club.id} />
        </section>
      )}
    </>
  );
}
