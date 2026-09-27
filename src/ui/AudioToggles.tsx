import { useState } from "react";
import { audio, type AudioPrefs } from "../audio";

/** Audio AC 1, AC 2: the music and effects switches, applied and saved on the click. */
export function AudioToggles() {
  const [prefs, setPrefs] = useState(() => audio().prefs());
  const toggle = (key: keyof AudioPrefs) => {
    const next = { ...prefs, [key]: !prefs[key] };
    audio().setPrefs(next);
    setPrefs(next);
  };
  return (
    <div className="speeds audio-toggles" role="group" aria-label="Som">
      <button className={`speed${prefs.music ? " is-on" : ""}`} aria-pressed={prefs.music} onClick={() => toggle("music")}>
        Música
      </button>
      <button className={`speed${prefs.sfx ? " is-on" : ""}`} aria-pressed={prefs.sfx} onClick={() => toggle("sfx")}>
        Efeitos
      </button>
    </div>
  );
}
