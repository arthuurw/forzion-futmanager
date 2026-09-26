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
    <>
      <section className="panel champion-card">
        <h1>Fim da temporada</h1>
        <div className="trophy" aria-hidden="true" />
        {champion && <p className="champion">Campeão: {champion.name}</p>}
      </section>
      <section className="panel">
        <h2 className="title-bar">Classificação final</h2>
        <Table league={league} highlightClubId={game.userClubId} />
      </section>
      <div className="action-bar">
        <NewGameButton primary />
      </div>
    </>
  );
}
