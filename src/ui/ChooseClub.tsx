import { bestElevenMean } from "../engine/lineup";
import { userLeague } from "../engine/season";
import { useGame } from "../store";

/** AC 7: 20 clubs, alphabetical, with the mean rating of the best eleven. */
export function ChooseClub() {
  const game = useGame((s) => s.game);
  const chooseClub = useGame((s) => s.chooseClub);
  if (!game) return null;
  const clubs = [...userLeague(game).clubs].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  return (
    <>
      <h1>Escolher clube</h1>
      <div className="club-list">
        {clubs.map((club) => (
          <button key={club.id} onClick={() => void chooseClub(club.id)}>
            {club.name} — força {bestElevenMean(club).toFixed(1)}
          </button>
        ))}
      </div>
    </>
  );
}
