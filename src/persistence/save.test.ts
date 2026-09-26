import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { openDB } from "idb";
import { newGame } from "../engine/generate";
import { playRound } from "../engine/season";
import type { GameState } from "../engine/types";
import { DB_NAME, DB_VERSION, SLOT, STORE, loadGame, saveGame } from "./save";

function fixture(): GameState {
  const state = newGame(11);
  state.userClubId = state.leagues[0]!.clubs[0]!.id;
  return state;
}

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

describe("save (door 1, door 7)", () => {
  test("documento tem schemaVersion 1 e leagues array", async () => {
    await saveGame(fixture());
    const db = await openDB(DB_NAME, DB_VERSION);
    const doc = await db.get(STORE, SLOT);
    db.close();
    expect(DB_NAME).toBe("brasfoot");
    expect(STORE).toBe("saves");
    expect(SLOT).toBe("slot-1");
    expect(doc.schemaVersion).toBe(1);
    expect(typeof doc.seed).toBe("number");
    expect(typeof doc.rngState).toBe("number");
    expect(doc.season).toBe(1);
    expect(doc.userClubId).toBe("c1");
    expect(Array.isArray(doc.leagues)).toBe(true);
    expect(doc.leagues).toHaveLength(1);
  });

  test("resultado persistido tem só placar e gols", async () => {
    const { state } = playRound(fixture());
    await saveGame(state);
    const loaded = await loadGame();
    expect(loaded.kind).toBe("ok");
    if (loaded.kind !== "ok") return;
    const played = loaded.state.leagues[0]!.rounds[0]!.matches;
    expect(played).toHaveLength(10);
    for (const m of played) {
      expect(Object.keys(m.result!).sort()).toEqual(["awayGoals", "goals", "homeGoals"]);
      for (const g of m.result!.goals) expect(Object.keys(g).sort()).toEqual(["clubId", "minute", "playerId"]);
    }
    const raw = JSON.stringify(loaded.state);
    for (const type of ["kickoff", "shot_saved", "shot_missed", "halftime", "fulltime"]) expect(raw).not.toContain(type);
  });

  test("gravar duas vezes mesmo estado lê idêntico", async () => {
    const state = fixture();
    await saveGame(state);
    await saveGame(state);
    const loaded = await loadGame();
    expect(loaded).toEqual({ kind: "ok", state });
  });

  test("sem save e save incompatível", async () => {
    expect(await loadGame()).toEqual({ kind: "none" });
    const db = await openDB(DB_NAME, DB_VERSION, { upgrade: (d) => d.createObjectStore(STORE) });
    await db.put(STORE, { schemaVersion: 7 }, SLOT);
    db.close();
    expect(await loadGame()).toEqual({ kind: "incompatible", version: 7 });
  });
});
