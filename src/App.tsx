import { useEffect } from "react";
import { useGame } from "./store";
import { Banner } from "./ui/Banner";
import { ChooseClub } from "./ui/ChooseClub";
import { End } from "./ui/End";
import { Home } from "./ui/Home";
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
    <main>
      {!onTitle && (
        <div className="top-strip">
          <span className="logo" aria-hidden="true">
            Brasfoot
          </span>
          {season !== undefined && <span className="season">TEMPORADA {season}</span>}
        </div>
      )}
      <Banner />
      {onTitle && <Home />}
      {phase === "chooseClub" && <ChooseClub />}
      {phase === "squad" && <Squad />}
      {phase === "round" && <Round />}
      {phase === "end" && <End />}
    </main>
  );
}
