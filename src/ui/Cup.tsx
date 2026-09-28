import { useState } from "react";
import { cupGoalLabel } from "../engine/board";
import { nextDate } from "../engine/calendar";
import { CONTINENTAL_CUP_ID, cupChampion, cupPhaseNames, cupReached, isAlive } from "../engine/cup";
import { findAnyClub } from "../engine/season";
import type { Country, Cup as CupState, GameState, MatchResult } from "../engine/types";
import { useGame } from "../store";
import { Flag } from "./Flag";
import { ScreenTabs } from "./ScreenTabs";

/** Copa-continental AC 18: the country beside each club of the continental cup. */
export const COUNTRY_CODE: Readonly<Record<Country, string>> = { BR: "BRA", AR: "ARG", PT: "POR" };

/** Copa-nacional AC 16: «1 x 1 (pên. 4 x 3)». */
export function scoreText(result: Pick<MatchResult, "homeGoals" | "awayGoals">, penalties?: { home: number; away: number } | null): string {
  const score = `${result.homeGoals} x ${result.awayGoals}`;
  return penalties ? `${score} (pên. ${penalties.home} x ${penalties.away})` : score;
}

/** «Copa Nacional · Oitavas». */
export function cupPhaseTitle(cup: CupState, phase: number): string {
  return `${cup.name} · ${cup.phases[phase]?.name ?? ""}`;
}

/** Copa-nacional AC 4: what the next «Jogar rodada» plays. */
export function nextDateLabel(game: GameState, rounds: number, currentRound: number): string {
  const date = nextDate(game);
  const cup = date.kind === "cup" ? game.cups[date.cupIndex] : undefined;
  if (date.kind === "cup" && cup) return cupPhaseTitle(cup, date.phase);
  return `Rodada ${currentRound + 1} de ${rounds}`;
}

/** Copa-nacional AC 40: «Meta na copa: chegar às oitavas». */
export function cupGoalText(goal: number): string {
  return `Meta na copa: ${cupGoalLabel(goal)}`;
}

/** Copa-nacional AC 47, copa-continental AC 20: the phase of cup `cupId` reached, or «Campeão». */
export function reachedText(reached: number | null, cupId: string): string {
  if (reached === null) return "-";
  const names = cupPhaseNames(cupId);
  return reached >= names.length ? "Campeão" : (names[reached] ?? "-");
}

/** Copa-nacional AC 43, copa-continental AC 19. */
function situation(cup: CupState, clubId: string): string {
  if (!cup.seeding.includes(clubId)) return "Fora da competição";
  if (cupChampion(cup) === clubId) return "Campeão";
  if (isAlive(cup, clubId)) return "Na disputa";
  return `Eliminado na ${reachedText(cupReached(cup, clubId), cup.id)}`;
}

/**
 * Copa-nacional S7: the phases, every tie, the user's situation and the cup goal. Copa-continental
 * AC 16, 17: one tab per cup, opening on the continental when the user's club plays it.
 */
export function Cup() {
  const game = useGame((s) => s.game);
  const goToSquad = useGame((s) => s.goToSquad);
  const userId = game?.userClubId ?? null;
  const [index, setIndex] = useState(() => (userId && game?.cups[1]?.seeding.includes(userId) ? 1 : 0));
  const cup = game?.cups[index] ?? game?.cups[0];
  if (!game || !cup) return null;
  const name = (id: string) => findAnyClub(game, id).name;
  const continental = cup.id === CONTINENTAL_CUP_ID;
  const country = (id: string) => game.leagues.find((l) => l.clubs.some((c) => c.id === id))?.country;
  const tag = (id: string) => {
    const code = continental ? country(id) : undefined;
    return code ? <span className="country-tag">{COUNTRY_CODE[code]}</span> : null;
  };

  return (
    <div className="screen">
      <div className="screen-head">
        <h1 className="title-bar">{cup.name}</h1>
        {userId && (
          <span className="goal">
            {situation(cup, userId)}
            {index === 0 && game.cupGoal >= 0 && ` · ${cupGoalText(game.cupGoal)}`}
          </span>
        )}
        {game.cups.length > 1 && (
          <ScreenTabs
            active={String(index)}
            onChange={(id) => setIndex(Number(id))}
            tabs={game.cups.map((c, i) => ({ id: String(i), label: c.name }))}
          />
        )}
      </div>
      <div className={`screen-body cup-body${continental ? " cup-body-2x2" : ""}`}>
        {cup.phases.map((phase, k) => (
          <section key={`${cup.id}-${phase.name}`} aria-label={phase.name} className="panel" style={{ "--i": k } as React.CSSProperties}>
            <h2 className="title-bar">{phase.name}</h2>
            {phase.ties.length === 0 ? (
              <p className="empty">a sortear</p>
            ) : (
              <ul className={`results fill${continental ? " tagged" : ""}`}>
                {phase.ties.map((t) => (
                  <li key={t.id} className={t.homeId === userId || t.awayId === userId ? "mine" : undefined}>
                    <Flag clubId={t.homeId} name={name(t.homeId)} size={13} />
                    {tag(t.homeId)}
                    <span className="h">{name(t.homeId)}</span> <b>{t.result ? scoreText(t.result, t.penalties) : "x"}</b>{" "}
                    <span className="a">{name(t.awayId)}</span>
                    {tag(t.awayId)}
                    <Flag clubId={t.awayId} name={name(t.awayId)} size={13} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
      <div className="action-bar">
        <button onClick={goToSquad}>Voltar ao elenco</button>
      </div>
    </div>
  );
}
