import { useRef, type ChangeEvent } from "react";
import { useGame } from "../store";
import { canExport, downloadSave } from "./download";
import { NewGameButton } from "./NewGameButton";

/** Title screen. */
export function Home() {
  const phase = useGame((s) => s.phase);
  const game = useGame((s) => s.game);
  const hasSave = useGame((s) => s.hasSave);
  const incompatibleVersion = useGame((s) => s.incompatibleVersion);
  const loadFailed = useGame((s) => s.loadFailed);
  const openFailed = useGame((s) => s.openFailed);
  const retryLoad = useGame((s) => s.retryLoad);
  const importMessage = useGame((s) => s.importMessage);
  const pendingImport = useGame((s) => s.pendingImport);
  const continueGame = useGame((s) => s.continueGame);
  const importFile = useGame((s) => s.importFile);
  const confirmImport = useGame((s) => s.confirmImport);
  const cancelImport = useGame((s) => s.cancelImport);
  const goToAbout = useGame((s) => s.goToAbout);
  const goToSaves = useGame((s) => s.goToSaves);
  // Varios-saves AC 8: «Jogos salvos» once any slot holds something.
  const anySlot = useGame((s) => s.slots.some((slot) => slot.kind !== "empty"));
  const fileInput = useRef<HTMLInputElement>(null);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) await importFile(await file.text());
  }

  return (
    <div className="title-screen">
      <h1 className="logo-big">
        Forzion <span className="logo-sub">FutManager</span>
      </h1>
      <div className="tagline">Manager de futebol</div>
      {phase === "loading" ? (
        <p className="loading blink">Carregando…</p>
      ) : pendingImport ? (
        <div role="alertdialog" aria-label="Confirmar importação" className="panel confirm">
          {/* Varios-saves AC 22: only after a failed read, which may hide the game in slot 1. */}
          <p>Isso substitui o jogo salvo. Continuar?</p>
          <button className="primary" autoFocus onClick={() => void confirmImport()}>
            Sim, substituir
          </button>
          <button onClick={cancelImport}>Cancelar</button>
        </div>
      ) : (
        <div className="menu">
          {incompatibleVersion !== null && <p className="notice">Jogo salvo incompatível (versão {String(incompatibleVersion)})</p>}
          {loadFailed && (
            <p className="notice" role="alert">
              Não foi possível ler o jogo salvo
            </p>
          )}
          {openFailed && (
            <p className="notice" role="alert">
              Não foi possível abrir o jogo salvo
            </p>
          )}
          {importMessage !== null && (
            <p className="notice" role="alert">
              {importMessage}
            </p>
          )}
          {hasSave && (
            <button className="primary" onClick={continueGame}>
              Continuar
            </button>
          )}
          {loadFailed && (
            <button className="primary" onClick={() => void retryLoad()}>
              Tentar de novo
            </button>
          )}
          {anySlot && <button onClick={goToSaves}>Jogos salvos</button>}
          {canExport(game) && <button onClick={() => downloadSave(game)}>Exportar jogo</button>}
          <button onClick={() => fileInput.current?.click()}>Importar jogo</button>
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            aria-label="Arquivo do jogo salvo"
            hidden
            onChange={(e) => void onFile(e)}
          />
          <NewGameButton primary={!hasSave} />
          <button onClick={goToAbout}>Sobre</button>
        </div>
      )}
    </div>
  );
}
