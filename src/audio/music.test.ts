import { createRng, type Rng } from "../engine/rng";
import type { Phase } from "../store";
import { createAudio } from "./audio";
import type { AudioBackend } from "./backend";
import { CONTEXT_TRACKS, PHASE_CONTEXT, trackUrl } from "./music";
import { downloads, fakeBackend, musicRamps, trackStarts } from "./test-backend";
import { webAudioBackend } from "./webaudio";

const constant = (v: number): Rng => ({ next: () => v, getState: () => 0 });

type Doc = EventTarget & { hidden: boolean };

function setup(rng: Rng = createRng(1), backend: AudioBackend = fakeBackend()) {
  const doc: Doc = Object.assign(new EventTarget(), { hidden: false });
  const audio = createAudio({ backend, rng, doc, storage: () => null });
  const gesture = (type = "pointerdown") => doc.dispatchEvent(new Event(type));
  return { audio, doc, gesture };
}

/** Lets the download and decode promises settle. */
async function flush(): Promise<void> {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

async function advance(ms: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms);
  await flush();
}

/** The audio after the first gesture on `phase`, its first track playing. */
async function playingOn(phase: Phase, rng?: Rng) {
  const backend = fakeBackend();
  const s = setup(rng, backend);
  s.audio.setPhase(phase);
  s.gesture();
  await flush();
  return { ...s, backend };
}

const GESTAO = ["audio/music/gestao-1.mp3", "audio/music/gestao-2.mp3", "audio/music/gestao-3.mp3"];

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("música (audio S1, S3)", () => {
  test("faixas e caminhos", () => {
    // C23 (door 3).
    expect(Object.values(CONTEXT_TRACKS).flat()).toEqual(["abertura", "gestao-1", "gestao-2", "gestao-3", "fim-de-temporada"]);
    expect(trackUrl("abertura")).toBe("audio/music/abertura.mp3");
    expect(trackUrl("gestao-1")).toBe("audio/music/gestao-1.mp3");
    expect(trackUrl("gestao-2")).toBe("audio/music/gestao-2.mp3");
    expect(trackUrl("gestao-3")).toBe("audio/music/gestao-3.mp3");
    expect(trackUrl("fim-de-temporada")).toBe("audio/music/fim-de-temporada.mp3");
  });

  test("contexto de cada tela", () => {
    // C15: the 12 phases.
    const table: [Phase, string][] = [
      ["home", "abertura"],
      ["chooseClub", "abertura"],
      ["squad", "gestao"],
      ["market", "gestao"],
      ["finance", "gestao"],
      ["round", "gestao"],
      ["history", "gestao"],
      ["cup", "gestao"],
      ["end", "fimDeTemporada"],
      ["newSeason", "fimDeTemporada"],
      ["loading", "none"],
      ["live", "none"],
    ];
    expect(Object.keys(PHASE_CONTEXT).sort()).toEqual(table.map(([p]) => p).sort());
    for (const [phase, context] of table) expect(PHASE_CONTEXT[phase], phase).toBe(context);
  });

  for (const gestureType of ["pointerdown", "keydown"]) {
    test(`nada toca antes do primeiro gesto (${gestureType})`, async () => {
      // C5.
      const backend = fakeBackend();
      const { audio, gesture } = setup(createRng(1), backend);
      audio.setPhase("home");
      audio.matchEvents([{ minute: 1, type: "kickoff", clubId: "c1" }], "c1");
      audio.crowd("running");
      await advance(120_000);
      expect(backend.calls).toEqual([]);

      gesture(gestureType);
      await flush();
      expect(backend.calls[0]).toEqual({ kind: "start" });
      expect(trackStarts(backend.calls)).toEqual(["audio/music/abertura.mp3"]);
    });
  }

  test("desligar a música some em até 1 s", async () => {
    // C4 (music).
    const { audio, backend } = await playingOn("squad");
    expect(trackStarts(backend.calls)).toHaveLength(1);
    audio.setPrefs({ music: false, sfx: true });
    const [ramp] = musicRamps(backend.calls);
    expect(ramp).toMatchObject({ gain: 0 });
    expect((ramp as { seconds: number }).seconds).toBeLessThanOrEqual(1);
    await advance(1000);
    expect(backend.calls.at(-1)).toEqual({ kind: "stop-track" });
    await advance(120_000);
    expect(trackStarts(backend.calls)).toHaveLength(1);
  });

  test("aba escondida suspende o áudio", async () => {
    // C6.
    const { doc, backend } = await playingOn("home");
    doc.hidden = true;
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(backend.calls.at(-1)).toEqual({ kind: "suspend" });
    doc.hidden = false;
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(backend.calls.at(-1)).toEqual({ kind: "resume" });
    await advance(5000);
    expect(trackStarts(backend.calls)).toEqual(["audio/music/abertura.mp3"]);
    expect(backend.calls.some((c) => c.kind === "stop-track")).toBe(false);
  });

  test("sem música na partida", async () => {
    // C13.
    const { audio, backend } = await playingOn("squad");
    audio.setPhase("live");
    expect(musicRamps(backend.calls)).toEqual([{ kind: "music-ramp", gain: 0, seconds: 1 }]);
    await advance(120_000);
    expect(trackStarts(backend.calls)).toHaveLength(1);
  });

  test("mesmo contexto não recomeça", async () => {
    // C16.
    const { audio, backend } = await playingOn("squad");
    for (const phase of ["market", "finance", "squad"] as const) {
      audio.setPhase(phase);
      await advance(2000);
    }
    expect(trackStarts(backend.calls)).toHaveLength(1);
    expect(GESTAO).toContain(trackStarts(backend.calls)[0]);
    expect(backend.calls.filter((c) => c.kind === "stop-track")).toEqual([]);
    expect(musicRamps(backend.calls)).toEqual([]);
  });

  test("troca de contexto com fade de 1 s", async () => {
    // C17.
    const { audio, backend } = await playingOn("squad");
    audio.setPhase("end");
    expect(musicRamps(backend.calls)).toEqual([{ kind: "music-ramp", gain: 0, seconds: 1 }]);
    await advance(999);
    expect(trackStarts(backend.calls)).not.toContain("audio/music/fim-de-temporada.mp3");
    await advance(1);
    expect(trackStarts(backend.calls).at(-1)).toBe("audio/music/fim-de-temporada.mp3");

    // Back to management during the fade: only the last context's track starts.
    const again = await playingOn("squad");
    again.audio.setPhase("end");
    await advance(500);
    again.audio.setPhase("squad");
    await advance(5000);
    const starts = trackStarts(again.backend.calls);
    expect(starts).toHaveLength(2);
    expect(GESTAO).toContain(starts[1]);
    expect(downloads(again.backend.calls)).not.toContain("audio/music/fim-de-temporada.mp3");
  });

  test("silêncio de 30 a 90 s entre faixas", async () => {
    // C18. A Rng at 0: the next track at 30 s, not at 29.999 s.
    const low = await playingOn("squad", constant(0));
    low.backend.endTrack();
    await advance(29_999);
    expect(trackStarts(low.backend.calls)).toHaveLength(1);
    await advance(1);
    expect(trackStarts(low.backend.calls)).toHaveLength(2);

    // At 0.999999: between 89.9 s and 90 s, not before 89.9 s.
    const high = await playingOn("squad", constant(0.999999));
    high.backend.endTrack();
    await advance(89_899);
    expect(trackStarts(high.backend.calls)).toHaveLength(1);
    await advance(101);
    expect(trackStarts(high.backend.calls)).toHaveLength(2);

    // Seeded with 1: 200 ends in a row, each silence in [30 s, 90 s].
    const { backend } = await playingOn("squad", createRng(1));
    for (let i = 0; i < 200; i++) {
      const before = trackStarts(backend.calls).length;
      backend.endTrack();
      await advance(29_999);
      expect(trackStarts(backend.calls), `fim ${i}`).toHaveLength(before);
      await advance(60_001);
      expect(trackStarts(backend.calls), `fim ${i}`).toHaveLength(before + 1);
    }
  });

  test("próxima faixa diferente da anterior", async () => {
    // C19.
    const { audio, backend } = await playingOn("squad", createRng(1));
    for (let i = 1; i < 50; i++) {
      backend.endTrack();
      await advance(90_000);
    }
    const starts = trackStarts(backend.calls);
    expect(starts).toHaveLength(50);
    for (let i = 1; i < starts.length; i++) expect(starts[i], `faixa ${i}`).not.toBe(starts[i - 1]);
    expect(new Set(starts)).toEqual(new Set(GESTAO));

    // A context with one track plays it again after the silence.
    audio.setPhase("end");
    await advance(1000);
    expect(trackStarts(backend.calls).at(-1)).toBe("audio/music/fim-de-temporada.mp3");
    backend.endTrack();
    await advance(90_000);
    expect(trackStarts(backend.calls).slice(-2)).toEqual(["audio/music/fim-de-temporada.mp3", "audio/music/fim-de-temporada.mp3"]);
  });

  test("música na metade do volume dos efeitos", async () => {
    // C20.
    const { backend } = await playingOn("home");
    const master = (bus: string) => backend.calls.find((c) => c.kind === "master" && c.bus === bus) as { gain: number };
    expect(master("sfx").gain).toBe(0.5);
    expect(master("music").gain).toBe(0.25);
    expect(master("music").gain * 2).toBe(master("sfx").gain);
  });

  test("faixa baixada só quando toca", async () => {
    // C21.
    const { audio, backend } = await playingOn("home");
    expect(downloads(backend.calls)).toEqual(["audio/music/abertura.mp3"]);
    audio.setPhase("squad");
    await advance(1000);
    const first = trackStarts(backend.calls).at(-1)!;
    expect(GESTAO).toContain(first);
    expect(downloads(backend.calls)).toEqual(["audio/music/abertura.mp3", first]);
    for (let i = 0; i < 5; i++) {
      audio.setPhase("live");
      await advance(1000);
      audio.setPhase("round");
      await advance(1000);
    }
    const urls = downloads(backend.calls);
    expect(urls.filter((u) => u === first)).toHaveLength(1);
    expect(new Set(urls).size).toBe(urls.length);
  });

  for (const failure of ["download", "decode"] as const) {
    test(`faixa que falha vira silêncio (${failure})`, async () => {
      // C22. A Rng at 0 picks gestao-1 first.
      const error = vi.spyOn(console, "error");
      const backend = fakeBackend();
      (failure === "download" ? backend.failDownload : backend.failDecode).add("audio/music/gestao-1.mp3");
      const { audio, gesture } = setup(constant(0), backend);
      audio.setPhase("squad");
      expect(() => gesture()).not.toThrow();
      await flush();
      expect(downloads(backend.calls)).toEqual(["audio/music/gestao-1.mp3"]);
      expect(trackStarts(backend.calls)).toEqual([]);
      await advance(29_999);
      expect(trackStarts(backend.calls)).toEqual([]);
      await advance(1);
      expect(trackStarts(backend.calls)).toEqual(["audio/music/gestao-2.mp3"]);
      expect(error).not.toHaveBeenCalled();
    });
  }

  test("sem AudioContext o áudio fica mudo", async () => {
    // C26: the default backend, where there is no AudioContext (node).
    expect((globalThis as { AudioContext?: unknown }).AudioContext).toBeUndefined();
    const backend = webAudioBackend();
    const spies = Object.fromEntries(Object.keys(backend).map((k) => [k, vi.spyOn(backend, k as keyof AudioBackend)]));
    const { audio, gesture } = setup(createRng(1), backend);
    expect(() => {
      audio.setPhase("home");
      gesture();
      audio.setPhase("squad");
      audio.matchEvents([{ minute: 10, type: "goal", clubId: "c1" }], "c1");
      audio.crowd("running");
    }).not.toThrow();
    await advance(5000);
    expect(spies.start).toHaveBeenCalledTimes(1);
    expect(spies.start).toHaveReturnedWith(false);
    for (const k of ["playEffect", "playTrack", "download", "startAmbience", "setMasterGain", "rampMusic"]) {
      expect(spies[k], k).not.toHaveBeenCalled();
    }
  });
});
