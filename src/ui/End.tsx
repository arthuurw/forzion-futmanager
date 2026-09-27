import { useState } from "react";
import { DIVISION_LABEL, VERDICT_TEXT, divisionAt, divisionOf, goalLabel } from "../engine/board";
import { bestElevenMean } from "../engine/lineup";
import { findAnyClub, seasonReview } from "../engine/season";
import { useGame } from "../store";
import { reachedText } from "./Cup";
import { formatMoney } from "./money";
import { NewGameButton } from "./NewGameButton";
import { DivisionTable } from "./Table";

/** AC 9, AC 34: the season's summary, the board's verdict and, when fired, the job offers. */
export function End() {
  const game = useGame((s) => s.game);
  const nextSeason = useGame((s) => s.nextSeason);
  const saving = useGame((s) => s.saving);
  const [job, setJob] = useState<string | null>(null);
  if (!game) return null;
  const review = seasonReview(game);
  const name = (id: string) => findAnyClub(game, id).name;
  const [a, b] = review.divisions;
  const fired = review.user?.verdict === "fired";

  return (
    <div className="screen">
      <div className="screen-body end-body">
        <section className="panel champion-card" style={{ "--i": 0 } as React.CSSProperties}>
          <h1>Fim da temporada {review.season}</h1>
          <div className="end-summary">
          <div className="trophy" aria-hidden="true" />
          <div className="champions">
          {review.divisions.map((d) => (
            <div key={d.leagueId} className="division-result">
              <span className="division-name">{d.label}</span>
              <p className="champion">Campeão: {name(d.championId)}</p>
            </div>
          ))}
          {review.cups.map((c) => (
            <section key={c.cupId} aria-label={c.name} className="division-result">
              <h2 className="division-name">{c.name}</h2>
              {c.championId && <p className="champion">Campeão: {name(c.championId)}</p>}
              {c.runnerUpId && <p>Vice: {name(c.runnerUpId)}</p>}
              {review.user && <p>Sua campanha: {reachedText(c.userReached)}</p>}
            </section>
          ))}
          </div>
          <div className="moves">
            {b && (
              <section aria-label="Sobem">
                <h2>Sobem</h2>
                <ol>
                  {b.promotedIds.map((id) => (
                    <li key={id}>{name(id)}</li>
                  ))}
                </ol>
              </section>
            )}
            {a && (
              <section aria-label="Descem">
                <h2>Descem</h2>
                <ol>
                  {a.relegatedIds.map((id) => (
                    <li key={id}>{name(id)}</li>
                  ))}
                </ol>
              </section>
            )}
          </div>
          {review.user && (
            <div className="verdict">
              <p>
                Sua posição: {review.user.position}º na {DIVISION_LABEL[review.user.divisionIndex]}
              </p>
              <p>Prêmio: {formatMoney(review.user.prize)}</p>
              <p>Meta: {goalLabel(divisionAt(game.leagues, review.user.divisionIndex), review.user.goal)}</p>
              <p className={`verdict-text v-${review.user.verdict}`}>{VERDICT_TEXT[review.user.verdict]}</p>
            </div>
          )}
          {fired && (
            <section aria-label="Propostas de emprego" className="job-offers">
              <h2>Propostas de emprego</h2>
              <ul>
                {review.jobOffers.map((id) => {
                  const club = findAnyClub(game, id);
                  return (
                    <li key={id}>
                      <button aria-pressed={job === id} className={job === id ? "selected" : undefined} onClick={() => setJob(id)}>
                        {club.name} · {DIVISION_LABEL[divisionOf(game, id)]} · força {bestElevenMean(club).toFixed(1)}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
          </div>
          <div className="champion-actions">
            <button className="primary" disabled={saving || (fired && !job)} onClick={() => void nextSeason(job ?? undefined)}>
              Próxima temporada
            </button>
            <NewGameButton />
          </div>
        </section>
        <section className="panel" style={{ "--i": 1 } as React.CSSProperties}>
          <h2 className="title-bar">Classificação final</h2>
          <div className="fill">
            <DivisionTable game={game} highlightClubId={game.userClubId} />
          </div>
        </section>
      </div>
    </div>
  );
}
