/** The entry point the screens use: one audio for the page. Tests replace its backend with `installAudio`. */
import { createRng } from "../engine/rng";
import { createAudio, type GameAudio } from "./audio";
import type { AudioBackend } from "./backend";
import { webAudioBackend } from "./webaudio";

export type { GameAudio } from "./audio";
export type { AudioPrefs } from "./prefs";
export type { Crowd } from "./sfx";

let current: GameAudio | null = null;

/** Replaces the page's audio, reading the prefs again; the default backend is silent without Web Audio. */
export function installAudio(backend: AudioBackend = webAudioBackend()): GameAudio {
  current?.dispose();
  current = createAudio({
    backend,
    // Seeded with the time: the audio's variety never touches the game's Rng (Impact).
    rng: createRng(Date.now()),
    doc: document,
    storage: () => window.localStorage,
  });
  return current;
}

export function audio(): GameAudio {
  return current ?? installAudio();
}
