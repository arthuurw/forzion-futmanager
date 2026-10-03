import { useState } from "react";
import { nextCompetition, nextDate } from "../engine/calendar";
import { cupChampion } from "../engine/cup";
import { validateLineup } from "../engine/lineup";
import { gameNarrationContext, narrate } from "../engine/narration";
import { findAnyClub, userLeague } from "../engine/season";
import { useGame, userClub } from "../store";
import { BoardWarning, OfferPanel } from "./Career";
import { cupPhaseTitle, nextDateLabel, scoreText } from "./Cup";
import { Flag } from "./Flag";
import { missingStartersText } from "./lineupText";
import { formatMoney, formatNumber } from "./money";
import { newsText } from "./newsText";
import { ScreenTabs, tabPanel } from "./ScreenTabs";
import { DivisionTable } from "./Table";

type RoundTab = "match" | "results" | "table" | "news";

/**
 * AC 18, AC 28: the round just played, the user's match narrated, every other score, the table.
 * A cup date (copa-nacional AC 46) shows the phase's ties and the next draw, or the champion.
 */
export function Round() {
  const game = useGame((s) => s.game);
  const lastRound = useGame((s) => s.lastRound);
  const goToSquad = useGame((s) => s.goToSquad);
  const playRound = useGame((s) => s.playRound);
  // Correcoes-validacao AC 44: a date without the user's match opens on the results.
  const userPlayed = !!game && !!lastRound && lastRound.results.some((r) => r.homeId === game.userClubId || r.awayId === game.userClubId);
  const [tab, setTab] = useState<RoundTab>(userPlayed ? "match" : "results");
  if (!game || !lastRound) return null;
  const club = userClub(game);
  if (!club) return null;
  const league = userLeague(game);
  const cupDate = lastRound.cup;
  const cup = cupDate ? game.cups[cupDate.cupIndex] : undefined;
  const ctx = gameNarrationContext(game);
  const mine = lastRound.results.find((r) => r.homeId === club.id || r.awayId === club.id);
  const others = cup ? lastRound.results : lastRound.results.filter((r) => r !== mine);
  const validation = validateLineup(club, club.lineup, nextCompetition(game));
  const over = nextDate(game).kind === "over";
  const canPlay = validation.ok && !over;
  const name = (id: string) => findAnyClub(game, id).name;
  const nextPhase = cup && cupDate ? cup.phases[cupDate.phase + 1] : undefined;
  const champion = cup ? cupChampion(cup) : null;
  const panelClass = (id: RoundTab) => `panel${tab === id ? " m-active" : ""}`;
  // Noticias AC 11: the news of the date on screen, in the order kept.
  const dateNews = (game.news ?? []).filter((n) =>
    n.season === game.season && (cup && cupDate
      ? n.date.kind === "cup" && n.date.cupId === cup.id && n.date.phase === cupDate.phase
      : n.date.kind === "league" && n.date.round === lastRound.roundNumber),
  );

  return (
    <div className="screen">
      <div className="screen-head">
        <h1 className="title-bar">{cup && cupDate ? cupPhaseTitle(cup, cupDate.phase) : `Rodada ${lastRound.roundNumber}`}</h1>
        <ScreenTabs
          idBase="round"
          hideOnDesktop
          active={tab}
          onChange={setTab}
          tabs={[
            // Correcoes-validacao AC 44: no «Partida» tab on a date without the user's match.
            ...(mine ? [{ id: "match" as const, label: "Partida" }] : []),
            { id: "results", label: "Resultados" },
            { id: "table", label: cup ? "Próxima fase" : "Classificação" },
            { id: "news", label: `Notícias (${dateNews.length})` },
          ]}
        />
      </div>

      <div className="screen-body round-body tabbed">
        {mine && (
          <section aria-label="Sua partida" {...tabPanel("round", "match", { named: true })} className={panelClass("match")} style={{ "--i": 0 } as React.CSSProperties}>
            <h2 className="scorebug">
              <Flag clubId={mine.homeId} name={name(mine.homeId)} size={20} />
              <span className="team home">{name(mine.homeId)}</span>{" "}
              <span className="score">{mine.result.homeGoals}</span>
              <span className="vs"> x </span>
              <span className="score">{mine.result.awayGoals}</span>
              {mine.penalties && <span className="pens"> (pên. {mine.penalties.home} x {mine.penalties.away})</span>}{" "}
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

        <section aria-label={cup ? "Confrontos" : "Outros resultados"} {...tabPanel("round", "results", { named: true })} className={panelClass("results")} style={{ "--i": 1 } as React.CSSProperties}>
          <h2 className="title-bar">{cup ? "Confrontos" : "Outros resultados"}</h2>
          <ul className="results fill">
            {others.map((r) => (
              <li key={r.matchId}>
                <Flag clubId={r.homeId} name={name(r.homeId)} size={13} />
                <span className="h">{name(r.homeId)}</span>{" "}
                <b>{scoreText(r.result, r.penalties)}</b>{" "}
                <span className="a">{name(r.awayId)}</span>
                <Flag clubId={r.awayId} name={name(r.awayId)} size={13} />
              </li>
            ))}
          </ul>
        </section>

        {cup ? (
          <section aria-label={champion ? "Campeão" : "Próxima fase"} {...tabPanel("round", "table", { named: true })} className={panelClass("table")} style={{ "--i": 2 } as React.CSSProperties}>
            <h2 className="title-bar">{champion ? cup.name : "Próxima fase"}</h2>
            {champion ? (
              <p className="champion">Campeão: {name(champion)}</p>
            ) : (
              <ul className="results fill">
                {nextPhase?.ties.map((t) => (
                  <li key={t.id}>
                    <Flag clubId={t.homeId} name={name(t.homeId)} size={13} />
                    <span className="h">{name(t.homeId)}</span> <b>x</b> <span className="a">{name(t.awayId)}</span>
                    <Flag clubId={t.awayId} name={name(t.awayId)} size={13} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : (
          <section {...tabPanel("round", "table")} className={panelClass("table")} style={{ "--i": 2 } as React.CSSProperties}>
            <h2 className="title-bar">Classificação</h2>
            <div className="fill">
              <DivisionTable game={game} highlightClubId={club.id} />
            </div>
          </section>
        )}

        <section aria-label="Notícias" {...tabPanel("round", "news", { named: true })} className={panelClass("news")} style={{ "--i": 3 } as React.CSSProperties}>
          <h2 className="title-bar">Notícias</h2>
          {dateNews.length === 0 ? (
            <p className="empty">Nada de novo nesta data.</p>
          ) : (
            <ul className="news fill">
              {dateNews.map((n, i) => (
                <li key={i}>{newsText(n, game)}</li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <OfferPanel />

      <div className="action-bar">
        <span className="matchday">{nextDateLabel(game, league.rounds.length, league.currentRound)}</span>
        <button onClick={goToSquad}>Escalação</button>
        <BoardWarning />
        {!validation.ok && !over && (
          <p role="status" className="missing">
            {missingStartersText(validation.missing)}
          </p>
        )}
        <button className="primary" disabled={!canPlay} onClick={() => void playRound()}>
          Jogar rodada
        </button>
      </div>
    </div>
  );
}
