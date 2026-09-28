import { DIVISION_LABEL, divisionAt, goalLabel } from "../engine/board";
import { findAnyClub } from "../engine/season";
import { useGame } from "../store";
import { cupGoalText } from "./Cup";
import { POSITION_LABEL } from "./Squad";

/**
 * AC 14: who retired, whose contract ended, how each player's rating moved, and the new goal.
 * Ajustes-audio AC 10: the champions of the 4 leagues, from the season just closed.
 * Copa-continental AC 22: whether the user's club plays the continental cup.
 */
export function NewSeason() {
  const report = useGame((s) => s.rolloverReport);
  const game = useGame((s) => s.game);
  const goToSquad = useGame((s) => s.goToSquad);
  if (!report) return null;
  const closed = game?.history.at(-1);
  // Copa-continental AC 22: the user's club is in the new continental cup.
  const qualified = !!game?.userClubId && !!game.cups[1]?.seeding.includes(game.userClubId);
  const leagueLabel = (leagueId: string) => DIVISION_LABEL[game?.leagues.findIndex((l) => l.id === leagueId) ?? -1] ?? "";
  const changes = [...report.changes].sort((a, b) => b.after - b.before - (a.after - a.before) || a.name.localeCompare(b.name, "pt-BR"));
  return (
    <div className="screen">
      <div className="screen-head">
        <h1 className="title-bar">Nova temporada</h1>
        <span className="goal">
          Temporada {report.season} · {DIVISION_LABEL[report.divisionIndex] ?? ""} · Meta: {goalLabel(divisionAt(game?.leagues ?? [], report.divisionIndex), report.boardGoal)}
          {report.cupGoal >= 0 && ` · ${cupGoalText(report.cupGoal)}`}
          {qualified && " · Copa Continental"}
        </span>
      </div>
      <div className="screen-body new-season-body">
        <section aria-label="Campeões" className="panel" style={{ "--i": 0 } as React.CSSProperties}>
          <h2 className="title-bar">Campeões</h2>
          <div className="fill">
            <table aria-label="Campeões" className="compact">
              <thead>
                <tr>
                  <th>Liga</th>
                  <th>Campeão</th>
                </tr>
              </thead>
              <tbody>
                {game &&
                  closed?.divisions.map((d) => (
                    <tr key={d.leagueId}>
                      <td>{leagueLabel(d.leagueId)}</td>
                      <td>{findAnyClub(game, d.championId).name}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
        <section aria-label="Aposentados" className="panel" style={{ "--i": 1 } as React.CSSProperties}>
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
        <section aria-label="Fim de contrato" className="panel" style={{ "--i": 2 } as React.CSSProperties}>
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
        <section aria-label="Evolução" className="panel" style={{ "--i": 3 } as React.CSSProperties}>
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
