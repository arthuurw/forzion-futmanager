import { DIVISION_LABEL, divisionOf } from "../engine/board";
import { BOARD_PATIENCE } from "../engine/career";
import { bestElevenMean } from "../engine/lineup";
import { findAnyClub } from "../engine/season";
import type { GameState } from "../engine/types";
import { useGame } from "../store";

/** Carreira-dinamica AC 7, AC 18: «<nome> · <divisão> · força <x.x>». */
export function jobLine(game: GameState, clubId: string): string {
  const club = findAnyClub(game, clubId);
  return `${club.name} · ${DIVISION_LABEL[divisionOf(game, clubId)]} · força ${bestElevenMean(club).toFixed(1)}`;
}

/** Carreira-dinamica AC 6: the board's warning, 1 to 3 rounds in a row in the firing zone. */
export function BoardWarning() {
  const warnings = useGame((s) => s.game?.boardWarnings ?? 0);
  if (warnings < 1) return null;
  return (
    <p role="status" className="missing">
      Aviso da diretoria ({warnings}/{BOARD_PATIENCE - 1}): a campanha está abaixo do aceitável.
    </p>
  );
}

/** Carreira-dinamica AC 18, AC 19: the offers of better clubs, to take or turn down. */
export function OfferPanel() {
  const game = useGame((s) => s.game);
  const saving = useGame((s) => s.saving);
  const takeJob = useGame((s) => s.takeJob);
  const declineJob = useGame((s) => s.declineJob);
  const job = game?.pendingJob;
  if (!game || job?.reason !== "offer") return null;
  return (
    <div role="dialog" aria-label="Proposta de emprego" className="panel confirm inline job-offer">
      <p>Proposta de emprego</p>
      {job.clubIds.map((id) => (
        <span key={id} className="job-choice">
          <span>{jobLine(game, id)}</span>
          <button className="primary" disabled={saving} aria-label={`Aceitar ${findAnyClub(game, id).name}`} onClick={() => void takeJob(id)}>
            Aceitar
          </button>
        </span>
      ))}
      <button disabled={saving} onClick={() => void declineJob()}>
        Recusar
      </button>
    </div>
  );
}
