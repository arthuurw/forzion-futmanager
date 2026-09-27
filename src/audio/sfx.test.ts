import { createRng, type Rng } from "../engine/rng";
import type { MatchEvent, MatchEventType } from "../engine/types";
import { createAudio } from "./audio";
import { effects, fakeBackend, type Call } from "./test-backend";

const constant = (v: number): Rng => ({ next: () => v, getState: () => 0 });

/** The audio after the first gesture, the user's club being "u" and the opponent "o". */
function started(rng: Rng = createRng(1)) {
  const backend = fakeBackend();
  const doc = Object.assign(new EventTarget(), { hidden: false });
  const audio = createAudio({ backend, rng, doc, storage: () => null });
  doc.dispatchEvent(new Event("pointerdown"));
  const send = (type: MatchEventType, clubId = "u") => audio.matchEvents([{ minute: 10, type, clubId } satisfies MatchEvent], "u");
  const effectCalls = () => backend.calls.filter((c): c is Extract<Call, { kind: "effect" }> => c.kind === "effect");
  return { audio, backend, send, effectCalls };
}

const wait = (ms: number) => vi.advanceTimersByTime(ms);

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("efeitos da partida (audio S2)", () => {
  test("efeito de cada tipo de evento", () => {
    // C7: the 12 event types, both sides of a goal, one second apart.
    const table: [MatchEventType, string, string[]][] = [
      ["kickoff", "u", ["whistle-short"]],
      ["halftime", "u", ["whistle-double"]],
      ["fulltime", "u", ["whistle-long"]],
      ["goal", "u", ["crowd-roar", "goal-jingle"]],
      ["goal", "o", ["crowd-groan"]],
      ["penalty_scored", "u", ["crowd-roar", "goal-jingle"]],
      ["penalty_scored", "o", ["crowd-groan"]],
      ["shot_saved", "u", ["crowd-ooh"]],
      ["shot_missed", "o", ["crowd-ooh"]],
      ["penalty_missed", "u", ["crowd-ooh"]],
      ["yellow", "o", ["whistle-short"]],
      ["red", "u", ["whistle-short", "crowd-boo"]],
      ["injury", "u", []],
      ["substitution", "u", []],
    ];
    const types = new Set(table.map(([t]) => t));
    expect(types.size).toBe(12);
    const { backend, send } = started();
    for (const [type, side, expected] of table) {
      const before = backend.calls.length;
      send(type, side);
      expect(effects(backend.calls.slice(before)), `${type} ${side}`).toEqual(expected);
      wait(1000);
    }
  });

  test("efeitos desligados não tocam", () => {
    // C4 (effects).
    const { audio, backend, send } = started();
    audio.setPrefs({ music: true, sfx: false });
    send("goal");
    expect(effects(backend.calls)).toEqual([]);
    wait(1000);
    audio.setPrefs({ music: true, sfx: true });
    send("goal");
    expect(effects(backend.calls)).toContain("crowd-roar");
  });

  test("ambiente da torcida segue o relógio", () => {
    // C9: clock -> crowd-ambience gain.
    const { audio, backend } = started();
    const ramps = () => backend.calls.filter((c) => c.kind === "ambience-ramp");
    audio.crowd("running");
    expect(backend.calls.filter((c) => c.kind === "ambience-start")).toHaveLength(1);
    expect(ramps().at(-1)).toMatchObject({ gain: 1 });
    audio.crowd("halftime");
    expect(ramps().at(-1)).toMatchObject({ gain: 0.4 });
    audio.crowd("paused");
    expect(ramps().at(-1)).toMatchObject({ gain: 0 });
    audio.crowd("running");
    expect(ramps().at(-1)).toMatchObject({ gain: 1 });
    audio.crowd("over");
    expect(backend.calls.slice(-2)).toEqual([
      { kind: "ambience-ramp", gain: 0, seconds: 2 },
      { kind: "ambience-stop", afterSeconds: 2 },
    ]);
    expect(backend.calls.filter((c) => c.kind === "ambience-start")).toHaveLength(1);
  });

  test("variantes e afinação", () => {
    // C10.
    const { send, effectCalls } = started(createRng(1));
    for (let i = 0; i < 200; i++) {
      send("goal", "u");
      send("goal", "o");
      send("shot_saved");
      wait(1000);
    }
    for (const id of ["crowd-roar", "crowd-groan", "crowd-ooh"]) {
      const played = effectCalls().filter((c) => c.id === id);
      expect(played, id).toHaveLength(200);
      expect(new Set(played.map((c) => c.variant)).size, id).toBeGreaterThanOrEqual(2);
    }
    for (const c of effectCalls()) {
      expect(c.pitch).toBeGreaterThanOrEqual(0.94);
      expect(c.pitch).toBeLessThanOrEqual(1.06);
    }

    const low = started(constant(0));
    low.send("shot_saved");
    expect(low.effectCalls()[0]!.pitch).toBe(0.94);
    const high = started(constant(0.999999));
    high.send("shot_saved");
    expect(high.effectCalls()[0]!.pitch).toBeGreaterThan(1.0599);
    expect(high.effectCalls()[0]!.pitch).toBeLessThanOrEqual(1.06);
  });

  test("mesmo efeito em menos de 400 ms", () => {
    // C11.
    const a = started();
    a.send("shot_saved");
    wait(399);
    a.send("shot_missed");
    expect(effects(a.backend.calls)).toEqual(["crowd-ooh"]);

    const b = started();
    b.send("shot_saved");
    wait(400);
    b.send("shot_missed");
    expect(effects(b.backend.calls)).toEqual(["crowd-ooh", "crowd-ooh"]);

    const c = started();
    c.send("shot_saved");
    wait(100);
    c.send("kickoff");
    expect(effects(c.backend.calls)).toEqual(["crowd-ooh", "whistle-short"]);
  });
});
