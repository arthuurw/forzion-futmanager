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
  const init = useGame((s) => s.init);
  useEffect(() => {
    void init();
  }, [init]);

  return (
    <main>
      <Banner />
      {phase === "loading" && <Home />}
      {phase === "home" && <Home />}
      {phase === "chooseClub" && <ChooseClub />}
      {phase === "squad" && <Squad />}
      {phase === "round" && <Round />}
      {phase === "end" && <End />}
    </main>
  );
}
