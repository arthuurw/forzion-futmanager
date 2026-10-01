import { useState } from "react";
import { useGame } from "../store";

/**
 * Correcoes-validacao AC 60: `?seed=<n>` in the page's address starts the new game with that seed,
 * so `check:layout` measures the same game every run. Without it, the seed is drawn as before.
 */
function seedParam(): number | undefined {
  const n = Number(new URLSearchParams(window.location.search).get("seed") ?? NaN);
  return Number.isSafeInteger(n) && n > 0 ? n : undefined;
}

/**
 * Varios-saves AC 18: a new game goes to an empty slot, so it no longer asks. Correcoes-validacao
 * AC 2 (varios-saves AC 22): a failed read may hide a game in slot 1, so then it still asks.
 */
export function NewGameButton({ primary = false }: { primary?: boolean }) {
  const loadFailed = useGame((s) => s.loadFailed);
  const newGame = useGame((s) => s.newGame);
  const [confirming, setConfirming] = useState(false);
  const mustConfirm = loadFailed;

  if (confirming) {
    return (
      <div role="alertdialog" aria-label="Confirmar novo jogo" className="panel confirm">
        <p>Isso apaga o jogo salvo. Continuar?</p>
        {/* Correcoes-validacao AC 50: the focus goes to the confirmation's main button. */}
        <button className="primary" autoFocus onClick={() => newGame(seedParam())}>
          Sim, apagar
        </button>
        <button onClick={() => setConfirming(false)}>Cancelar</button>
      </div>
    );
  }
  return (
    <button className={primary ? "primary" : undefined} onClick={() => (mustConfirm ? setConfirming(true) : newGame(seedParam()))}>
      Novo jogo
    </button>
  );
}
