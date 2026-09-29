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
 * AC 10: starting over on top of an existing save asks first. Correcoes-validacao AC 2: so does a
 * failed read, which may hide one.
 */
export function NewGameButton({ primary = false }: { primary?: boolean }) {
  const hasSave = useGame((s) => s.hasSave);
  const incompatibleVersion = useGame((s) => s.incompatibleVersion);
  const loadFailed = useGame((s) => s.loadFailed);
  const newGame = useGame((s) => s.newGame);
  const [confirming, setConfirming] = useState(false);
  const mustConfirm = hasSave || incompatibleVersion !== null || loadFailed;

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
