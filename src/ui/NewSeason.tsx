import { divisionAt, goalLabel } from "../engine/board";
import { useGame } from "../store";
import { cupGoalText } from "./Cup";
import { POSITION_LABEL } from "./Squad";

/** AC 14: who retired, whose contract ended, how each player's rating moved, and the new goal. */
export function NewSeason() {
  const report = useGame((s) => s.rolloverReport);
  const game = useGame((s) => s.game);
  const goToSquad = useGame((s) => s.goToSquad);
  if (!report) return null;
  const changes = [...report.changes].sort((a, b) => b.after - b.before - (a.after - a.before) || a.name.localeCompare(b.name, "pt-BR"));
  return (
    <div className="screen">
      <div className="screen-head">
        <h1 className="title-bar">Nova temporada</h1>
        <span className="goal">
          Temporada {report.season} · Meta: {goalLabel(divisionAt(game?.leagues ?? [], report.divisionIndex), report.boardGoal)}
          {report.cupGoal >= 0 && ` · ${cupGoalText(report.cupGoal)}`}
        </span>
      </div>
      <div className="screen-body new-season-body">
        <section aria-label="Aposentados" className="panel" style={{ "--i": 0 } as React.CSSProperties}>
          <h2 className="title-bar">Aposentados</h2>
          {report.retired.length === 0 ? (
            <p className="empty">Ninguém se aposentou</p>
          ) : (
            <ul className="offers">
              {report.retired.map((p) => (
                <li key={p.id}>{p.name}</li>
              ))}
            </ul>
          )}
        </section>
        <section aria-label="Fim de contrato" className="panel" style={{ "--i": 1 } as React.CSSProperties}>
          <h2 className="title-bar">Fim de contrato</h2>
          {report.expired.length === 0 ? (
            <p className="empty">Nenhum contrato encerrado</p>
          ) : (
            <ul className="offers">
              {report.expired.map((p) => (
                <li key={p.id}>{p.name}</li>
              ))}
            </ul>
          )}
        </section>
        <section aria-label="Evolução" className="panel" style={{ "--i": 2 } as React.CSSProperties}>
          <h2 className="title-bar">Evolução</h2>
          <div className="fill">
            <table aria-label="Evolução" className="compact">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Pos</th>
                  <th className="num">Antes</th>
                  <th className="num">Depois</th>
                </tr>
              </thead>
              <tbody>
                {changes.map((c) => (
                  <tr key={c.playerId} className={c.after > c.before ? "up" : c.after < c.before ? "down" : undefined}>
                    <td>{c.name}</td>
                    <td>
                      <span className={`pos pos-${c.position}`}>{POSITION_LABEL[c.position]}</span>
                    </td>
                    <td className="num">{c.before}</td>
                    <td className="num">{c.after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <div className="action-bar">
        <button className="primary" onClick={goToSquad}>
          Continuar
        </button>
      </div>
    </div>
  );
}
