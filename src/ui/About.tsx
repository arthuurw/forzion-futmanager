import { version } from "../../package.json";
import { useGame } from "../store";

/** The five tracks of `public/audio/music/CREDITS.md`, all CC0 (lancamento AC 24). */
export const MUSIC_CREDITS = [
  { title: "Old Tricks", author: "Zane Little Music" },
  { title: "Hush Hamlet", author: "Zane Little Music" },
  { title: "Apple Cider", author: "Zane Little Music" },
  { title: "Aura Horizon", author: "Zane Little Music" },
  { title: "Summer Memories", author: "Juhani Junkala" },
];

const FONTS = ["Exo 2", "Barlow Semi Condensed"];

/** «Sobre»: version, the fiction notice and the credits (lancamento AC 23-26). */
export function About() {
  const goHome = useGame((s) => s.goHome);
  return (
    <div className="about-screen">
      <div className="panel about">
        <h2>Forzion FutManager</h2>
        <p className="about-version">Versão {version}</p>
        <p>Clubes, jogadores e competições são fictícios.</p>
        <p>O jogo fica salvo só neste navegador. Use Exportar jogo para levá-lo a outro aparelho.</p>
        <h3>Músicas</h3>
        <ul>
          {MUSIC_CREDITS.map((m) => (
            <li key={m.title}>
              {m.title} — {m.author} (CC0)
            </li>
          ))}
        </ul>
        <h3>Fontes</h3>
        <ul>
          {FONTS.map((f) => (
            <li key={f}>{f} — SIL Open Font License 1.1</li>
          ))}
        </ul>
        <button className="primary" onClick={goHome}>
          Voltar
        </button>
      </div>
    </div>
  );
}
