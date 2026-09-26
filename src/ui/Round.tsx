import { validateLineup } from "../engine/lineup";
import { narrate, narrationContext } from "../engine/narration";
import { findClub, userLeague } from "../engine/season";
import { useGame, userClub } from "../store";
import { Flag } from "./Flag";
import { Table } from "./Table";

/** AC 18, AC 28: the round just played, the user's match narrated, every other score, the table. */
export function Round() {
  const game = useGame((s) => s.game);
  const lastRound = useGame((s) => s.lastRound);
  const goToSquad = useGame((s) => s.goToSquad);
  const playRound = useGame((s) => s.playRound);
  if (!game || !lastRound) return null;
  const club = userClub(game);
  if (!club) return null;
  const league = userLeague(game);
  const ctx = narrationContext(league.clubs);
  const mine = lastRound.results.find((r) => r.homeId === club.id || r.awayId === club.id);
  const others = lastRound.results.filter((r) => r !== mine);
  const canPlay = validateLineup(club, club.lineup).ok && league.currentRound < league.rounds.length;
  const name = (id: string) => findClub(league, id).name;

  return (
    <>
      <h1 className="title-bar">Rodada {lastRound.roundNumber}</h1>

      <div className="grid-2">
        <div>
          {mine && (
            <section aria-label="Sua partida" className="panel">
              <h2 className="scorebug">
                <Flag clubId={mine.homeId} size={22} />
                <span className="team home">{name(mine.homeId)}</span>{" "}
                <span className="score">{mine.result.homeGoals}</span>
                <span className="vs"> x </span>
                <span className="score">{mine.result.awayGoals}</span>{" "}
                <span className="team">{name(mine.awayId)}</span>
                <Flag clubId={mine.awayId} size={22} />
              </h2>
              <div className="clock" aria-hidden="true">
                <span>90:00</span>
                <span>FIM DE JOGO</span>
              </div>
              <ul className="ticker">
                {lastRound.userEvents.map((e, i) => (
                  <li key={i} className={e.type}>
                    <span className="min">{e.minute}&apos;</span> <span>{narrate(e, ctx)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-label="Outros resultados" className="panel">
            <h2 className="title-bar">Outros resultados</h2>
            <ul className="results">
              {others.map((r) => (
                <li key={r.matchId}>
                  <Flag clubId={r.homeId} size={14} />
                  <span className="h">{name(r.homeId)}</span>{" "}
                  <b>
                    {r.result.homeGoals} x {r.result.awayGoals}
                  </b>{" "}
                  <span className="a">{name(r.awayId)}</span>
                  <Flag clubId={r.awayId} size={14} />
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="panel">
          <h2 className="title-bar">Classificação</h2>
          <Table league={league} highlightClubId={club.id} />
        </section>
      </div>

      <div className="action-bar">
        <span className="matchday">
          Rodada {league.currentRound + 1} de {league.rounds.length}
        </span>
        <button onClick={goToSquad}>Escalação</button>
        <button className="primary" disabled={!canPlay} onClick={() => void playRound()}>
          Jogar rodada
        </button>
      </div>
    </>
  );
}
