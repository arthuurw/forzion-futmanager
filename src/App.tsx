import { useEffect } from "react";
import { audio } from "./audio";
import { useGame } from "./store";
import { About } from "./ui/About";
import { AudioToggles } from "./ui/AudioToggles";
import { Banner } from "./ui/Banner";
import { ChooseClub } from "./ui/ChooseClub";
import { Cup } from "./ui/Cup";
import { End } from "./ui/End";
import { ErrorBoundary } from "./ui/ErrorBoundary";
import { Finance } from "./ui/Finance";
import { History } from "./ui/History";
import { Job } from "./ui/Job";
import { Home } from "./ui/Home";
import { Live } from "./ui/Live";
import { Market } from "./ui/Market";
import { NewSeason } from "./ui/NewSeason";
import { OtherTab } from "./ui/OtherTab";
import { Round } from "./ui/Round";
import { Saves } from "./ui/Saves";
import { Squad } from "./ui/Squad";

export function App() {
  return (
    <ErrorBoundary>
      <Screens />
    </ErrorBoundary>
  );
}

function Screens() {
  const phase = useGame((s) => s.phase);
  const otherTab = useGame((s) => s.otherTab);
  const season = useGame((s) => s.game?.season);
  const init = useGame((s) => s.init);
  useEffect(() => {
    void init();
  }, [init]);
  // Audio AC 14: the screen picks the music.
  useEffect(() => {
    audio().setPhase(phase);
  }, [phase]);

  const onHome = phase === "loading" || phase === "home";
  // Varios-saves: «Jogos salvos» is a title screen, like «Sobre».
  const onTitle = onHome || phase === "about" || phase === "saves";

  // Door 2 (correcoes-validacao): another tab holds the game.
  if (otherTab)
    return (
      <main className="app on-title">
        <div className="stage">
          <OtherTab />
        </div>
      </main>
    );

  return (
    <main className={`app${onTitle ? " on-title" : ""}`}>
      {!onTitle && (
        <div className="top-strip">
          <span className="logo" aria-hidden="true">
            Forzion FutManager
          </span>
          {season !== undefined && <span className="season">Temporada {season}</span>}
          <AudioToggles />
        </div>
      )}
      {onTitle && (
        <div className="title-audio">
          <AudioToggles />
        </div>
      )}
      <Banner />
      <div className="stage" key={onHome ? "title" : phase}>
        {onHome && <Home />}
        {phase === "about" && <About />}
        {phase === "saves" && <Saves />}
        {phase === "chooseClub" && <ChooseClub />}
        {phase === "squad" && <Squad />}
        {phase === "market" && <Market />}
        {phase === "finance" && <Finance />}
        {phase === "live" && <Live />}
        {phase === "round" && <Round />}
        {phase === "end" && <End />}
        {phase === "newSeason" && <NewSeason />}
        {phase === "history" && <History />}
        {phase === "cup" && <Cup />}
        {phase === "job" && <Job />}
      </div>
    </main>
  );
}
