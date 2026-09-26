import { useState } from "react";
import { formationSlots, validateLineup } from "../engine/lineup";
import { userLeague } from "../engine/season";
import { FORMATION_NAMES, POSITIONS, type FormationName } from "../engine/types";
import { useGame, userClub } from "../store";
import { Table } from "./Table";

const POSITION_LABEL: Record<(typeof POSITIONS)[number], string> = { GK: "GOL", DF: "ZAG", MF: "MEI", FW: "ATA" };

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

  // AC 9: by position, then rating descending.
  const roster = [...club.players].sort(
    (a, b) => POSITIONS.indexOf(a.position) - POSITIONS.indexOf(b.position) || b.rating - a.rating || a.name.localeCompare(b.name),
  );

  return (
    <>
      <h1>{club.name}</h1>
      <p>
        Rodada {league.currentRound + 1} de {league.rounds.length}
      </p>
      <div className="row">
        <section>
          <h2>Escalação</h2>
          <label>
            Formação
            <select
              aria-label="Formação"
              value={lineup?.formation ?? ""}
              onChange={(e) => setFormation(e.target.value as FormationName)}
            >
              {FORMATION_NAMES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          <div className="slots">
            {slots.map((position, i) => {
              const current = lineup?.starters[i] ?? "";
              const options = club.players.filter((p) => p.position === position);
              return (
                <label key={i}>
                  {POSITION_LABEL[position]}
                  <select aria-label={`Titular ${i + 1} (${POSITION_LABEL[position]})`} value={current} onChange={(e) => assignStarter(i, e.target.value)}>
                    {current === "" && <option value="">—</option>}
                    {options.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.rating})
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>
          {!validation.ok && <p role="status">Faltam {validation.missing} titulares</p>}
          <button disabled={!validation.ok} onClick={() => void playRound()}>
            Jogar rodada
          </button>
          <button onClick={() => setShowTable((v) => !v)}>{showTable ? "Ocultar tabela" : "Ver tabela"}</button>
        </section>
        <section>
          <h2>Elenco</h2>
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
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{POSITION_LABEL[p.position]}</td>
                  <td className="num">{p.age}</td>
                  <td className="num">{p.rating}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
      {showTable && (
        <section>
          <h2>Classificação</h2>
          <Table league={league} highlightClubId={club.id} />
        </section>
      )}
    </>
  );
}
