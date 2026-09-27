/** Tests only: a backend that records every call instead of making sound. */
import type { AudioBackend, Bus, EffectId, TrackData } from "./backend";

export type Call =
  | { kind: "start" }
  | { kind: "wake" }
  | { kind: "master"; bus: Bus; gain: number }
  | { kind: "effect"; id: EffectId; variant: number; pitch: number }
  | { kind: "ambience-start" }
  | { kind: "ambience-ramp"; gain: number; seconds: number }
  | { kind: "ambience-stop"; afterSeconds: number }
  | { kind: "download"; url: string }
  | { kind: "play-track"; url: string }
  | { kind: "music-ramp"; gain: number; seconds: number }
  | { kind: "stop-track" }
  | { kind: "suspend" }
  | { kind: "resume" };

export interface FakeBackend extends AudioBackend {
  calls: Call[];
  /** Ends the track playing now, as if it reached its last sample. */
  endTrack(): void;
  /** Urls whose download (or decode) rejects. */
  failDownload: Set<string>;
  failDecode: Set<string>;
}

interface FakeTrack {
  url: string;
}

export function fakeBackend(): FakeBackend {
  const calls: Call[] = [];
  let ended: (() => void) | null = null;
  const failDownload = new Set<string>();
  const failDecode = new Set<string>();
  const log = (c: Call) => void calls.push(c);
  return {
    calls,
    failDownload,
    failDecode,
    endTrack() {
      const f = ended;
      ended = null;
      f?.();
    },
    start: () => (log({ kind: "start" }), true),
    wake: () => log({ kind: "wake" }),
    setMasterGain: (bus, gain) => log({ kind: "master", bus, gain }),
    playEffect: (id, variant, pitch) => log({ kind: "effect", id, variant, pitch }),
    startAmbience: () => log({ kind: "ambience-start" }),
    rampAmbience: (gain, seconds) => log({ kind: "ambience-ramp", gain, seconds }),
    stopAmbience: (afterSeconds) => log({ kind: "ambience-stop", afterSeconds }),
    download(url) {
      log({ kind: "download", url });
      if (failDownload.has(url)) return Promise.reject(new Error(`404 ${url}`));
      return Promise.resolve(new TextEncoder().encode(url).buffer as ArrayBuffer);
    },
    decode(data): Promise<TrackData> {
      const url = new TextDecoder().decode(data);
      if (failDecode.has(url)) return Promise.reject(new Error(`bad ${url}`));
      return Promise.resolve({ url } satisfies FakeTrack);
    },
    playTrack(track, onEnded) {
      log({ kind: "play-track", url: (track as FakeTrack).url });
      ended = onEnded;
    },
    rampMusic: (gain, seconds) => log({ kind: "music-ramp", gain, seconds }),
    stopTrack() {
      ended = null;
      log({ kind: "stop-track" });
    },
    suspend: () => log({ kind: "suspend" }),
    resume: () => log({ kind: "resume" }),
  };
}

export const effects = (calls: Call[]) => calls.flatMap((c) => (c.kind === "effect" ? [c.id] : []));
export const trackStarts = (calls: Call[]) => calls.flatMap((c) => (c.kind === "play-track" ? [c.url] : []));
export const downloads = (calls: Call[]) => calls.flatMap((c) => (c.kind === "download" ? [c.url] : []));
export const musicRamps = (calls: Call[]) => calls.filter((c) => c.kind === "music-ramp");
