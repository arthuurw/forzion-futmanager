import { encodeSaveFile, saveFileName, userClubName } from "../engine/saveFile";
import type { GameState } from "../engine/types";

/** A game that can be exported: a club was chosen (lancamento AC 1, AC 4). */
export function canExport(game: GameState | null): game is GameState {
  return game !== null && userClubName(game) !== null;
}

/** Lancamento AC 2-3: hands the browser the save file to download. */
export function downloadSave(game: GameState): void {
  const text = encodeSaveFile(game, new Date().toISOString());
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = saveFileName(game.season, userClubName(game) ?? "");
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoked on the next task: revoking right after click() can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
