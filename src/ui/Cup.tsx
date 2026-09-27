import { cupGoalLabel } from "../engine/board";
import { nextDate } from "../engine/calendar";
import { CHAMPION_REACHED, CUP_PHASE_NAMES, cupChampion, cupReached, isAlive } from "../engine/cup";
import { findAnyClub } from "../engine/season";
import type { Cup as CupState, GameState, MatchResult } from "../engine/types";
import { useGame } from "../store";
import { Flag } from "./Flag";

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

/** Copa-nacional AC 47: the phase reached, or «Campeão». */
export function reachedText(reached: number | null): string {
  if (reached === null) return "-";
  return reached >= CHAMPION_REACHED ? "Campeão" : (CUP_PHASE_NAMES[reached] ?? "-");
}

/** Copa-nacional AC 43. */
function situation(cup: CupState, clubId: string): string {
  if (cupChampion(cup) === clubId) return "Campeão";
  if (isAlive(cup, clubId)) return "Na disputa";
  return `Eliminado na ${reachedText(cupReached(cup, clubId))}`;
}

/** Copa-nacional S7: the six phases, every tie, the user's situation and the cup goal. */
export function Cup() {
  const game = useGame((s) => s.game);
  const goToSquad = useGame((s) => s.goToSquad);
  const cup = game?.cups[0];
  if (!game || !cup) return null;
  const name = (id: string) => findAnyClub(game, id).name;
  const userId = game.userClubId;

  return (
    <div className="screen">
      <div className="screen-head">
        <h1 className="title-bar">{cup.name}</h1>
        {userId && (
          <span className="goal">
            {situation(cup, userId)}
            {game.cupGoal >= 0 && ` · ${cupGoalText(game.cupGoal)}`}
          </span>
        )}
      </div>
      <div className="screen-body cup-body">
        {cup.phases.map((phase, k) => (
          <section key={phase.name} aria-label={phase.name} className="panel" style={{ "--i": k } as React.CSSProperties}>
            <h2 className="title-bar">{phase.name}</h2>
            {phase.ties.length === 0 ? (
              <p className="empty">a sortear</p>
            ) : (
              <ul className="results fill">
                {phase.ties.map((t) => (
                  <li key={t.id} className={t.homeId === userId || t.awayId === userId ? "mine" : undefined}>
                    <Flag clubId={t.homeId} name={name(t.homeId)} size={13} />
                    <span className="h">{name(t.homeId)}</span> <b>{t.result ? scoreText(t.result, t.penalties) : "x"}</b>{" "}
                    <span className="a">{name(t.awayId)}</span>
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
