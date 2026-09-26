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
      <h1>Fim da temporada</h1>
      {champion && <p>Campeão: {champion.name}</p>}
      <Table league={league} highlightClubId={game.userClubId} />
      <NewGameButton />
    </>
  );
}
