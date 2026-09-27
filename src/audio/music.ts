import { pick, type Rng } from "../engine/rng";
import type { Phase } from "../store";
import type { AudioBackend, TrackData } from "./backend";

/** Where the music is: title, management, end of season, or none (the live match, loading). */
export type MusicContext = "abertura" | "gestao" | "fimDeTemporada" | "none";
export type TrackId = "abertura" | "gestao-1" | "gestao-2" | "gestao-3" | "fim-de-temporada";

/** AC 14. */
export const PHASE_CONTEXT: Record<Phase, MusicContext> = {
  loading: "none",
  home: "abertura",
  chooseClub: "abertura",
  squad: "gestao",
  market: "gestao",
  finance: "gestao",
  round: "gestao",
  history: "gestao",
  cup: "gestao",
  end: "fimDeTemporada",
  newSeason: "fimDeTemporada",
  live: "none",
};

/** Door 3: the five tracks, fixed in code. */
export const CONTEXT_TRACKS: Record<Exclude<MusicContext, "none">, readonly TrackId[]> = {
  abertura: ["abertura"],
  gestao: ["gestao-1", "gestao-2", "gestao-3"],
  fimDeTemporada: ["fim-de-temporada"],
};

export function trackUrl(id: TrackId): string {
  return `audio/music/${id}.mp3`;
}

export const FADE_MS = 1000;
/** AC 17: the silence after a track, drawn in [30 s, 90 s). */
export const SILENCE_MIN_MS = 30_000;
export const SILENCE_SPAN_MS = 60_000;

export interface Music {
  /** The first gesture happened and the backend has a context. */
  start(): void;
  setContext(context: MusicContext): void;
  setEnabled(on: boolean): void;
  dispose(): void;
}

export function createMusic(backend: AudioBackend, rng: Rng): Music {
  let started = false;
  let enabled = true;
  let context: MusicContext = "none";
  /** A track is on the backend (playing or fading). */
  let playing = false;
  let fading: ReturnType<typeof setTimeout> | null = null;
  let silence: ReturnType<typeof setTimeout> | null = null;
  /** Bumped whenever what should play changes: a pending load or an old track's end is then ignored. */
  let generation = 0;
  const last: Partial<Record<MusicContext, TrackId>> = {};
  /** AC 20, AC 21: each file is downloaded once; a failure resolves to null. */
  const loaded = new Map<string, Promise<TrackData | null>>();

  function load(id: TrackId): Promise<TrackData | null> {
    const url = trackUrl(id);
    let track = loaded.get(url);
    if (!track) {
      track = backend
        .download(url)
        .then((data) => backend.decode(data))
        .catch(() => null);
      loaded.set(url, track);
    }
    return track;
  }

  function clearSilence(): void {
    if (silence !== null) clearTimeout(silence);
    silence = null;
  }

  /** The context's next track, now: a different one from the last it played, when it has more. */
  function begin(): void {
    clearSilence();
    const token = ++generation;
    if (!started || !enabled || context === "none") return;
    const tracks = CONTEXT_TRACKS[context];
    const id = pick(rng, tracks.length > 1 ? tracks.filter((t) => t !== last[context]) : tracks);
    last[context] = id;
    void load(id).then((track) => {
      if (token !== generation) return;
      if (track === null) return rest(token);
      playing = true;
      backend.playTrack(track, () => {
        if (token !== generation) return;
        playing = false;
        rest(token);
      });
    });
  }

  /** AC 17, AC 21: silence, then the next track of the same context. */
  function rest(token: number): void {
    if (token !== generation) return;
    clearSilence();
    silence = setTimeout(begin, SILENCE_MIN_MS + rng.next() * SILENCE_SPAN_MS);
  }

  /** What should play changed: fade the current track out for 1 s, then start whatever is due then (AC 16). */
  function change(): void {
    if (!started) return;
    if (fading !== null) return;
    if (!playing) return begin();
    generation++;
    clearSilence();
    backend.rampMusic(0, FADE_MS / 1000);
    fading = setTimeout(() => {
      fading = null;
      playing = false;
      backend.stopTrack();
      begin();
    }, FADE_MS);
  }

  return {
    start() {
      if (started) return;
      started = true;
      begin();
    },
    setContext(next) {
      if (next === context) return;
      context = next;
      change();
    },
    setEnabled(on) {
      if (on === enabled) return;
      enabled = on;
      change();
    },
    dispose() {
      clearSilence();
      if (fading !== null) clearTimeout(fading);
      fading = null;
      generation++;
    },
  };
}
