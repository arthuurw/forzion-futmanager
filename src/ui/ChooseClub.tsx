import { bestElevenMean } from "../engine/lineup";
import { userLeague } from "../engine/season";
import { useGame } from "../store";
import { Flag } from "./Flag";
import { RatingBar } from "./RatingBar";

/** AC 7: 20 clubs, alphabetical, with the mean rating of the best eleven. */
export function ChooseClub() {
  const game = useGame((s) => s.game);
  const chooseClub = useGame((s) => s.chooseClub);
  if (!game) return null;
  const clubs = [...userLeague(game).clubs].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  return (
    <>
      <h1 className="title-bar">Escolher clube</h1>
      <div className="club-grid">
        {clubs.map((club) => {
          const strength = bestElevenMean(club);
          return (
            <button key={club.id} className="club-card" onClick={() => void chooseClub(club.id)}>
              <Flag clubId={club.id} size={26} />
              <span>{club.name}</span>
              <span className="strength">
                <RatingBar rating={strength} />
                <span>força {strength.toFixed(1)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
