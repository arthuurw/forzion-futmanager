import { useGame } from "../store";
import { canExport, downloadSave } from "./download";

/**
 * AC 27 and AC 32: persistence problems are shown, never fatal. Correcoes-validacao AC 10: with the
 * game only in memory, «Exportar jogo» is the way to keep it.
 */
export function Banner() {
  const saveStatus = useGame((s) => s.saveStatus);
  const game = useGame((s) => s.game);
  if (saveStatus === "ok") return null;
  const exportButton = canExport(game) && <button onClick={() => downloadSave(game)}>Exportar jogo</button>;
  if (saveStatus === "unavailable")
    return (
      <div className="banner">
        <span>Salvamento indisponível neste navegador</span> {exportButton}
      </div>
    );
  return (
    <div className="banner error">
      <span>Não foi possível salvar</span> {exportButton}
    </div>
  );
}
