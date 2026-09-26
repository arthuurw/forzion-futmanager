import { useGame } from "../store";
import { NewGameButton } from "./NewGameButton";

export function Home() {
  const phase = useGame((s) => s.phase);
  const hasSave = useGame((s) => s.hasSave);
  const incompatibleVersion = useGame((s) => s.incompatibleVersion);
  const continueGame = useGame((s) => s.continueGame);

  return (
    <>
      <h1>Brasfoot</h1>
      {phase === "loading" ? (
        <p>Carregando…</p>
      ) : (
        <>
          {incompatibleVersion !== null && <p>Jogo salvo incompatível (versão {String(incompatibleVersion)})</p>}
          {hasSave && <button onClick={continueGame}>Continuar</button>}
          <NewGameButton />
        </>
      )}
    </>
  );
}
