import { useGame } from "../store";
import { NewGameButton } from "./NewGameButton";

/** Title screen. */
export function Home() {
  const phase = useGame((s) => s.phase);
  const hasSave = useGame((s) => s.hasSave);
  const incompatibleVersion = useGame((s) => s.incompatibleVersion);
  const continueGame = useGame((s) => s.continueGame);

  return (
    <div className="title-screen">
      <h1 className="logo-big">Brasfoot</h1>
      <div className="tagline">Manager de futebol</div>
      {phase === "loading" ? (
        <p className="loading blink">Carregando…</p>
      ) : (
        <div className="menu">
          {incompatibleVersion !== null && <p className="notice">Jogo salvo incompatível (versão {String(incompatibleVersion)})</p>}
          {hasSave && (
            <button className="primary" onClick={continueGame}>
              Continuar
            </button>
          )}
          <NewGameButton primary={!hasSave} />
        </div>
      )}
    </div>
  );
}
