import { useState } from "react";
import { useGame } from "../store";

/** AC 10: starting over on top of an existing save asks first. */
export function NewGameButton() {
  const hasSave = useGame((s) => s.hasSave);
  const incompatibleVersion = useGame((s) => s.incompatibleVersion);
  const newGame = useGame((s) => s.newGame);
  const [confirming, setConfirming] = useState(false);
  const mustConfirm = hasSave || incompatibleVersion !== null;

  if (confirming) {
    return (
      <div role="alertdialog" aria-label="Confirmar novo jogo">
        <p>Isso apaga o jogo salvo. Continuar?</p>
        <button onClick={() => newGame()}>Sim, apagar</button>
        <button onClick={() => setConfirming(false)}>Cancelar</button>
      </div>
    );
  }
  return <button onClick={() => (mustConfirm ? setConfirming(true) : newGame())}>Novo jogo</button>;
}
