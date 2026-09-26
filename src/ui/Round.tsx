import { useState } from "react";
import { validateLineup } from "../engine/lineup";
import { narrate, narrationContext } from "../engine/narration";
import { findClub, userLeague } from "../engine/season";
import { useGame, userClub } from "../store";
import { Flag } from "./Flag";
import { formatMoney, formatNumber } from "./money";
import { ScreenTabs } from "./ScreenTabs";
import { Table } from "./Table";

type RoundTab = "match" | "results" | "table";

/** AC 18, AC 28: the round just played, the user's match narrated, every other score, the table. */
export function Round() {
  const game = useGame((s) => s.game);
  const lastRound = useGame((s) => s.lastRound);
  const goToSquad = useGame((s) => s.goToSquad);
  const playRound = useGame((s) => s.playRound);
  const [tab, setTab] = useState<RoundTab>("match");
  if (!game || !lastRound) return null;
  const club = userClub(game);
  if (!club) return null;
  const league = userLeague(game);
  const ctx = narrationContext(league.clubs);
  const mine = lastRound.results.find((r) => r.homeId === club.id || r.awayId === club.id);
  const others = lastRound.results.filter((r) => r !== mine);
  const canPlay = validateLineup(club, club.lineup).ok && league.currentRound < league.rounds.length;
  const name = (id: string) => findClub(league, id).name;
  const panelClass = (id: RoundTab) => `panel${tab === id ? " m-active" : ""}`;

  return (
    <div className="screen">
      <div className="screen-head">
        <h1 className="title-bar">Rodada {lastRound.roundNumber}</h1>
        <ScreenTabs
          hideOnDesktop
          active={tab}
          onChange={setTab}
          tabs={[
            { id: "match", label: "Partida" },
            { id: "results", label: "Resultados" },
            { id: "table", label: "Classificação" },
          ]}
        />
      </div>

      <div className="screen-body round-body tabbed">
        {mine && (
          <section aria-label="Sua partida" className={panelClass("match")} style={{ "--i": 0 } as React.CSSProperties}>
            <h2 className="scorebug">
              <Flag clubId={mine.homeId} name={name(mine.homeId)} size={20} />
              <span className="team home">{name(mine.homeId)}</span>{" "}
              <span className="score">{mine.result.homeGoals}</span>
              <span className="vs"> x </span>
              <span className="score">{mine.result.awayGoals}</span>{" "}
              <span className="team">{name(mine.awayId)}</span>
              <Flag clubId={mine.awayId} name={name(mine.awayId)} size={20} />
            </h2>
            <div className="clock" aria-hidden="true">
              <span>90:00</span>
              <span>Fim de jogo</span>
            </div>
            {mine.homeId === club.id && club.finance.lastRound && (
              <p className="gate">
                Público <b>{formatNumber(club.finance.lastRound.attendance)}</b> · Bilheteria <b>{formatMoney(club.finance.lastRound.tickets)}</b>
              </p>
            )}
            <ul className="ticker fill">
              {lastRound.userEvents.map((e, i) => (
                <li key={i} className={e.type} style={{ "--i": i } as React.CSSProperties}>
                  <span className="min">{e.minute}&apos;</span> <span>{narrate(e, ctx)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-label="Outros resultados" className={panelClass("results")} style={{ "--i": 1 } as React.CSSProperties}>
          <h2 className="title-bar">Outros resultados</h2>
          <ul className="results fill">
            {others.map((r) => (
              <li key={r.matchId}>
                <Flag clubId={r.homeId} name={name(r.homeId)} size={13} />
                <span className="h">{name(r.homeId)}</span>{" "}
                <b>
                  {r.result.homeGoals} x {r.result.awayGoals}
                </b>{" "}
                <span className="a">{name(r.awayId)}</span>
                <Flag clubId={r.awayId} name={name(r.awayId)} size={13} />
              </li>
            ))}
          </ul>
        </section>

        <section className={panelClass("table")} style={{ "--i": 2 } as React.CSSProperties}>
          <h2 className="title-bar">Classificação</h2>
          <div className="fill">
            <Table league={league} highlightClubId={club.id} />
          </div>
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
    </div>
  );
}
