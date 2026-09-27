/** Door 1 of audio: the music and effects switches, in their own localStorage key (not in the save). */

export const PREFS_KEY = "forzion-futmanager:audio";

export interface AudioPrefs {
  music: boolean;
  sfx: boolean;
}

export type PrefsStorage = Pick<Storage, "getItem" | "setItem">;

export interface PrefsStore {
  get(): AudioPrefs;
  /** Changes the prefs in memory and writes them; a storage that fails is ignored (AC 4). */
  set(prefs: AudioPrefs): void;
}

const BOTH_ON: AudioPrefs = { music: true, sfx: true };

function read(storage: () => PrefsStorage | null): AudioPrefs {
  try {
    const raw = storage()?.getItem(PREFS_KEY);
    if (raw == null) return BOTH_ON;
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return BOTH_ON;
    const { music, sfx } = value as Record<string, unknown>;
    return typeof music === "boolean" && typeof sfx === "boolean" ? { music, sfx } : BOTH_ON;
  } catch {
    return BOTH_ON;
  }
}

/** `storage` is a getter: reaching `window.localStorage` itself throws when the browser blocks it. */
export function createPrefs(storage: () => PrefsStorage | null): PrefsStore {
  let prefs = read(storage);
  return {
    get: () => prefs,
    set(next) {
      prefs = { music: next.music, sfx: next.sfx };
      try {
        storage()?.setItem(PREFS_KEY, JSON.stringify(prefs));
      } catch {
        // The switch still works for this visit.
      }
    },
  };
}
