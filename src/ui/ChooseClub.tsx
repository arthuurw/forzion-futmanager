import { useState } from "react";
import { DIVISION_LABEL } from "../engine/board";
import { bestElevenMean } from "../engine/lineup";
import { DIFFICULTIES, type Difficulty } from "../engine/types";
import { useGame } from "../store";
import { Flag } from "./Flag";
import { RatingBar } from "./RatingBar";
import { ScreenTabs, tabPanel } from "./ScreenTabs";

/** Dificuldade AC 1, AC 7. */
export const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: "Fácil", normal: "Normal", hard: "Difícil" };
const DIFFICULTY_LINE: Record<Difficulty, string> = {
  easy: "Mais caixa no começo, diretoria mais paciente e IA comprando menos.",
  normal: "O jogo de sempre.",
  hard: "Menos caixa no começo, diretoria exigente e IA comprando mais.",
};

/**
 * AC 7 of the core, AC 2, paises AC 21: the 20 clubs of each league, one tab per league,
 * alphabetical, with the mean rating of the best eleven.
 */
export function ChooseClub() {
  const game = useGame((s) => s.game);
  const chooseClub = useGame((s) => s.chooseClub);
  const [tab, setTab] = useState("l1");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  if (!game) return null;
  const league = game.leagues.find((l) => l.id === tab) ?? game.leagues[0]!;
  const clubs = [...league.clubs].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  return (
    <div className="screen">
      <div className="screen-head">
        <h1 className="title-bar">Escolher clube</h1>
        <ScreenTabs
          idBase="choose"
          shared
          active={tab}
          onChange={setTab}
          tabs={game.leagues.map((l, i) => ({ id: l.id, label: DIVISION_LABEL[i] ?? l.name }))}
        />
      </div>
      {/* Dificuldade AC 1: chosen with the club, Normal unless changed. */}
      <fieldset className="difficulty" aria-label="Dificuldade">
        <legend>Dificuldade</legend>
        {DIFFICULTIES.map((d) => (
          <label key={d}>
            <input type="radio" name="difficulty" value={d} checked={difficulty === d} onChange={() => setDifficulty(d)} />
            {DIFFICULTY_LABEL[d]}
          </label>
        ))}
        <span className="difficulty-line">{DIFFICULTY_LINE[difficulty]}</span>
      </fieldset>
      <div className="club-grid" key={tab} {...tabPanel("choose", tab, { shared: true })}>
        {clubs.map((club, i) => {
          const strength = bestElevenMean(club);
          return (
            <button key={club.id} className="club-card" style={{ "--i": i } as React.CSSProperties} onClick={() => void chooseClub(club.id, difficulty)}>
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
