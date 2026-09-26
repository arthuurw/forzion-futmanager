import { validateLineup } from "../engine/lineup";
import { narrate, narrationContext } from "../engine/narration";
import { findClub, userLeague } from "../engine/season";
import { useGame, userClub } from "../store";
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
  const scoreline = (r: (typeof lastRound.results)[number]) =>
    `${findClub(league, r.homeId).name} ${r.result.homeGoals} x ${r.result.awayGoals} ${findClub(league, r.awayId).name}`;

  return (
    <>
      <h1>Rodada {lastRound.roundNumber}</h1>
      {mine && (
        <section aria-label="Sua partida">
          <h2>{scoreline(mine)}</h2>
          <ul className="narration">
            {lastRound.userEvents.map((e, i) => (
              <li key={i} className={e.type}>
                {e.minute}&apos; {narrate(e, ctx)}
              </li>
            ))}
          </ul>
        </section>
      )}
      <section aria-label="Outros resultados">
        <h2>Outros resultados</h2>
        <ul>
          {others.map((r) => (
            <li key={r.matchId}>{scoreline(r)}</li>
          ))}
        </ul>
      </section>
      <section>
        <h2>Classificação</h2>
        <Table league={league} highlightClubId={club.id} />
      </section>
      <p>
        Rodada {league.currentRound + 1} de {league.rounds.length}
      </p>
      <button onClick={goToSquad}>Escalação</button>
      <button disabled={!canPlay} onClick={() => void playRound()}>
        Jogar rodada
      </button>
    </>
  );
}
