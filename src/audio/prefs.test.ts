import { createPrefs, type PrefsStorage } from "./prefs";

function memory(initial?: string): PrefsStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set("forzion-futmanager:audio", initial);
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
  };
}

describe("preferências de áudio (door 1)", () => {
  test("leitura e gravação das preferências", () => {
    // C3: value in the key -> state read.
    const table: [string, string | undefined, { music: boolean; sfx: boolean }][] = [
      ["ausente", undefined, { music: true, sfx: true }],
      ["válido", '{"music":false,"sfx":true}', { music: false, sfx: true }],
      ["JSON inválido", "lixo", { music: true, sfx: true }],
      ["tipo errado", '{"music":"no","sfx":1}', { music: true, sfx: true }],
    ];
    for (const [name, stored, expected] of table) {
      expect(createPrefs(() => memory(stored)).get(), name).toEqual(expected);
    }

    // getItem throws: both on, no exception.
    const throwingGet: PrefsStorage = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => undefined,
    };
    expect(() => createPrefs(() => throwingGet)).not.toThrow();
    expect(createPrefs(() => throwingGet).get()).toEqual({ music: true, sfx: true });
    // Reaching the storage itself throws.
    expect(
      createPrefs(() => {
        throw new Error("blocked");
      }).get(),
    ).toEqual({ music: true, sfx: true });

    // setItem throws: no exception, and the state in memory changes anyway.
    const throwingSet: PrefsStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    const prefs = createPrefs(() => throwingSet);
    expect(() => prefs.set({ music: false, sfx: true })).not.toThrow();
    expect(prefs.get()).toEqual({ music: false, sfx: true });

    // A working storage gets the literal shape.
    const store = memory();
    createPrefs(() => store).set({ music: true, sfx: false });
    expect(store.data.get("forzion-futmanager:audio")).toBe('{"music":true,"sfx":false}');
  });
});
