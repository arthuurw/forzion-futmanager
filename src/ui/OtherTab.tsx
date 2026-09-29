import { useGame } from "../store";

/** Door 2 (correcoes-validacao, AC 7, AC 8): the game is open in another tab; this one waits. */
export function OtherTab() {
  const useThisTab = useGame((s) => s.useThisTab);
  return (
    <div className="title-screen">
      <h1 className="logo-big">
        Forzion <span className="logo-sub">FutManager</span>
      </h1>
      <div className="menu">
        <p className="notice" role="alert">
          O jogo está aberto em outra aba
        </p>
        <button className="primary" onClick={() => void useThisTab()}>
          Usar nesta aba
        </button>
      </div>
    </div>
  );
}
