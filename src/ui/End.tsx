import { userLeague } from "../engine/season";
import { computeTable } from "../engine/table";
import { useGame } from "../store";
import { NewGameButton } from "./NewGameButton";
import { Table } from "./Table";

/** AC 29: season over, champion named, final table, no more rounds to play. */
export function End() {
  const game = useGame((s) => s.game);
  if (!game) return null;
  const league = userLeague(game);
  const champion = computeTable(league)[0];
  return (
    <div className="screen">
      <div className="screen-body end-body">
        <section className="panel champion-card" style={{ "--i": 0 } as React.CSSProperties}>
          <h1>Fim da temporada</h1>
          <div className="trophy" aria-hidden="true" />
          {champion && <p className="champion">Campeão: {champion.name}</p>}
          <div className="champion-actions">
            <NewGameButton primary />
          </div>
        </section>
        <section className="panel" style={{ "--i": 1 } as React.CSSProperties}>
          <h2 className="title-bar">Classificação final</h2>
          <div className="fill">
            <Table league={league} highlightClubId={game.userClubId} />
          </div>
        </section>
      </div>
    </div>
  );
}
