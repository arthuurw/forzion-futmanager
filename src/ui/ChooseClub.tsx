import { useState } from "react";
import { DIVISION_LABEL } from "../engine/board";
import { bestElevenMean } from "../engine/lineup";
import { useGame } from "../store";
import { Flag } from "./Flag";
import { RatingBar } from "./RatingBar";
import { ScreenTabs } from "./ScreenTabs";

type DivisionTab = "a" | "b";

/** AC 7 of the core, AC 2: the 20 clubs of each division, alphabetical, with the mean rating of the best eleven. */
export function ChooseClub() {
  const game = useGame((s) => s.game);
  const chooseClub = useGame((s) => s.chooseClub);
  const [tab, setTab] = useState<DivisionTab>("a");
  if (!game) return null;
  const league = game.leagues[tab === "a" ? 0 : 1] ?? game.leagues[0]!;
  const clubs = [...league.clubs].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  return (
    <div className="screen">
      <div className="screen-head">
        <h1 className="title-bar">Escolher clube</h1>
        <ScreenTabs
          active={tab}
          onChange={setTab}
          tabs={[
            { id: "a", label: DIVISION_LABEL[0] },
            { id: "b", label: DIVISION_LABEL[1] },
          ]}
        />
      </div>
      <div className="club-grid" key={tab}>
        {clubs.map((club, i) => {
          const strength = bestElevenMean(club);
          return (
            <button key={club.id} className="club-card" style={{ "--i": i } as React.CSSProperties} onClick={() => void chooseClub(club.id)}>
              <Flag clubId={club.id} name={club.name} size={24} />
              <span className="club-name">{club.name}</span>
              <span className="strength">
                <RatingBar rating={strength} />
                <span>força {strength.toFixed(1)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
