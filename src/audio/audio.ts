import type { Rng } from "../engine/rng";
import { PENALTY_EVENT_TYPES, type MatchEvent } from "../engine/types";
import type { Phase } from "../store";
import type { AudioBackend } from "./backend";
import { createMusic, PHASE_CONTEXT } from "./music";
import { createPrefs, type AudioPrefs, type PrefsStorage } from "./prefs";
import { createSfx, effectsFor, type Crowd } from "./sfx";

/** AC 19: the music at half the effects' volume. */
export const SFX_VOLUME = 0.5;
export const MUSIC_VOLUME = SFX_VOLUME / 2;

/** Ajustes-audio AC 7: the shoot-out's first kick after the final whistle, and the gap between kicks. */
export const SHOOTOUT_START_MS = 1500;
export const SHOOTOUT_GAP_MS = 1200;

/** What the audio needs from the page: user gestures, and whether the tab is hidden. */
export interface AudioDocument {
  readonly hidden: boolean;
  addEventListener(type: string, listener: () => void, options?: boolean | AddEventListenerOptions): void;
  removeEventListener(type: string, listener: () => void, options?: boolean | EventListenerOptions): void;
}

export interface AudioOptions {
  backend: AudioBackend;
  /** The audio's own Rng: never the game's `rngState` (Impact). */
  rng: Rng;
  doc: AudioDocument;
  storage: () => PrefsStorage | null;
  now?: () => number;
}

export interface GameAudio {
  prefs(): AudioPrefs;
  setPrefs(prefs: AudioPrefs): void;
  /** The screen on show: picks the music (AC 14). */
  setPhase(phase: Phase): void;
  /** New events of the user's match (AC 7). */
  matchEvents(events: readonly MatchEvent[], userClubId: string): void;
  /** The crowd ambience follows the match clock (AC 9). */
  crowd(state: Crowd): void;
  dispose(): void;
}

/** AC 5: the first of these starts the audio; later ones let a suspended context run. */
const GESTURES = ["pointerdown", "keydown", "pointerup", "touchend"];

export function createAudio({ backend, rng, doc, storage, now = Date.now }: AudioOptions): GameAudio {
  const prefs = createPrefs(storage);
  const music = createMusic(backend, rng);
  const sfx = createSfx(backend, rng, now);
  let tried = false;
  let started = false;
  /** The shoot-out still to sound; it plays on if the screen changes (plan Assumptions). */
  const pending = new Set<ReturnType<typeof setTimeout>>();

  function later(ms: number, play: () => void): void {
    const timer = setTimeout(() => {
      pending.delete(timer);
      play();
    }, ms);
    pending.add(timer);
  }

  music.setEnabled(prefs.get().music);
  sfx.setEnabled(prefs.get().sfx);

  function onGesture(): void {
    if (tried) {
      if (started && !doc.hidden) backend.wake();
      return;
    }
    tried = true;
    started = backend.start();
    if (!started) return;
    backend.setMasterGain("sfx", SFX_VOLUME);
    backend.setMasterGain("music", MUSIC_VOLUME);
    music.start();
  }

  /** AC 6. */
  function onVisibility(): void {
    if (!started) return;
    if (doc.hidden) backend.suspend();
    else backend.resume();
  }

  for (const type of GESTURES) doc.addEventListener(type, onGesture, true);
  doc.addEventListener("visibilitychange", onVisibility);

  return {
    prefs: () => prefs.get(),
    setPrefs(next) {
      prefs.set(next);
      music.setEnabled(next.music);
      sfx.setEnabled(next.sfx);
    },
    setPhase(phase) {
      music.setContext(PHASE_CONTEXT[phase]);
    },
    matchEvents(events, userClubId) {
      if (!started) return;
      const kicks = events.filter((e) => PENALTY_EVENT_TYPES.includes(e.type));
      for (const e of events) if (!kicks.includes(e)) for (const id of effectsFor(e, userClubId)) sfx.play(id);
      // Ajustes-audio AC 7, AC 8: the whole shoot-out arrives in the 90th minute; it sounds one kick
      // at a time, and the jingle closes it when the user wins.
      const goals = (mine: boolean) => kicks.filter((k) => k.type === "penalty_scored" && (k.clubId === userClubId) === mine).length;
      const steps = kicks.map((k) => effectsFor(k, userClubId));
      if (kicks.length && goals(true) > goals(false)) steps.push(["goal-jingle"]);
      steps.forEach((ids, i) => later(SHOOTOUT_START_MS + i * SHOOTOUT_GAP_MS, () => ids.forEach((id) => sfx.play(id))));
    },
    crowd(state) {
      if (started) sfx.crowd(state);
    },
    dispose() {
      for (const timer of pending) clearTimeout(timer);
      for (const type of GESTURES) doc.removeEventListener(type, onGesture, true);
      doc.removeEventListener("visibilitychange", onVisibility);
      music.dispose();
    },
  };
}
