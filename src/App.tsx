import { useEffect } from "react";
import { useGame } from "./store";
import { Banner } from "./ui/Banner";
import { ChooseClub } from "./ui/ChooseClub";
import { End } from "./ui/End";
import { Finance } from "./ui/Finance";
import { Home } from "./ui/Home";
import { Live } from "./ui/Live";
import { Market } from "./ui/Market";
import { Round } from "./ui/Round";
import { Squad } from "./ui/Squad";

export function App() {
  const phase = useGame((s) => s.phase);
  const season = useGame((s) => s.game?.season);
  const init = useGame((s) => s.init);
  useEffect(() => {
    void init();
  }, [init]);

  const onTitle = phase === "loading" || phase === "home";

  return (
    <main className={`app${onTitle ? " on-title" : ""}`}>
      {!onTitle && (
        <div className="top-strip">
          <span className="logo" aria-hidden="true">
            Brasfoot
          </span>
          {season !== undefined && <span className="season">Temporada {season}</span>}
        </div>
      )}
      <Banner />
      <div className="stage" key={onTitle ? "title" : phase}>
        {onTitle && <Home />}
        {phase === "chooseClub" && <ChooseClub />}
        {phase === "squad" && <Squad />}
        {phase === "market" && <Market />}
        {phase === "finance" && <Finance />}
        {phase === "live" && <Live />}
        {phase === "round" && <Round />}
        {phase === "end" && <End />}
      </div>
    </main>
  );
}
