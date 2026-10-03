import { managerReputation } from "../engine/career";
import { userLeague } from "../engine/season";
import { useGame, userClub } from "../store";
import { jobLine } from "./Career";
import { NewGameButton } from "./NewGameButton";

/** Carreira-dinamica AC 7, AC 8: fired in the middle of the season, the user must take one of the offers. */
export function Job() {
  const game = useGame((s) => s.game);
  const saving = useGame((s) => s.saving);
  const takeJob = useGame((s) => s.takeJob);
  const club = game ? userClub(game) : null;
  if (!game || !club || game.pendingJob?.reason !== "fired") return null;
  const offers = game.pendingJob.clubIds;

  return (
    <div className="screen">
      <div className="screen-body end-body job-body">
        <section className="panel champion-card" style={{ "--i": 0 } as React.CSSProperties}>
          <h1>Demitido</h1>
          <div className="verdict">
            <p>
              Você foi demitido do {club.name} na rodada {userLeague(game).currentRound}.
            </p>
            <p>Reputação: {managerReputation(game)}/100</p>
          </div>
          <section aria-label="Propostas de emprego" className="job-offers">
            <h2>Propostas de emprego</h2>
            <ul>
              {offers.map((id) => (
                <li key={id}>
                  <span>{jobLine(game, id)}</span>{" "}
                  <button className="primary" disabled={saving} onClick={() => void takeJob(id)}>
                    Assumir
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <div className="champion-actions">
            <NewGameButton />
          </div>
        </section>
      </div>
    </div>
  );
}
