/**
 * Door 2 of audio: every call to the browser's audio goes through this interface, so tests can
 * record the calls and a browser without Web Audio stays silent.
 */

export type EffectId =
  | "whistle-short"
  | "whistle-double"
  | "whistle-long"
  | "crowd-roar"
  | "goal-jingle"
  | "crowd-groan"
  | "crowd-ooh"
  | "crowd-boo";

export type Bus = "music" | "sfx";

/** A decoded track, opaque outside the backend. */
export type TrackData = unknown;

export interface AudioBackend {
  /** Creates the audio context, on the first user gesture. False when the browser has none: the audio stays silent. */
  start(): boolean;
  /** A later gesture: lets run a context the browser created suspended (a touch's pointerdown is not enough on some phones). */
  wake(): void;
  setMasterGain(bus: Bus, gain: number): void;
  playEffect(id: EffectId, variant: number, pitch: number): void;
  /** The crowd ambience loop starts at gain 0. */
  startAmbience(): void;
  rampAmbience(gain: number, seconds: number): void;
  /** Stops the crowd ambience `afterSeconds` from now. */
  stopAmbience(afterSeconds: number): void;
  download(url: string): Promise<ArrayBuffer>;
  decode(data: ArrayBuffer): Promise<TrackData>;
  /** Plays a track at gain 1, replacing the current one; `onEnded` runs when it plays to its end. */
  playTrack(track: TrackData, onEnded: () => void): void;
  rampMusic(gain: number, seconds: number): void;
  stopTrack(): void;
  suspend(): void;
  resume(): void;
}
