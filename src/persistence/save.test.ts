import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { openDB } from "idb";
import { newGame } from "../engine/generate";
import { autoLineup } from "../engine/lineup";
import { nextSeason } from "../engine/rollover";
import { playRound } from "../engine/season";
import type { GameState } from "../engine/types";
import { v1Document } from "../engine/test-fixtures";
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
  // Supersedes partida-ao-vivo C45 (schemaVersion 2): elenco-mercado-financas door 1 moves the save to v3.
  test("documento tem schemaVersion 4 com finanças e mercado", async () => {
    const state = fixture();
    const club = state.leagues[0]!.clubs[0]!;
    club.lineup = autoLineup(club, "4-4-2");
    await saveGame(state);
    const db = await openDB(DB_NAME, DB_VERSION);
    const doc = await db.get(STORE, SLOT);
    db.close();
    expect(DB_NAME).toBe("brasfoot");
    expect(STORE).toBe("saves");
    expect(SLOT).toBe("slot-1");
    // Supersedes elenco-mercado-financas C54: the document is v4 (multiplas-temporadas C51).
    expect(doc.schemaVersion).toBe(4);
    expect(doc.leagues.map((l: { id: string }) => l.id)).toEqual(["l1", "l2"]);
    expect(doc.history).toEqual([]);
    expect(Number.isInteger(doc.boardGoal)).toBe(true);
    for (const club of doc.leagues[0].clubs) {
      for (const k of ["cash", "sponsorship", "fans", "capacity", "ticketPrice", "expansionRoundsLeft", "loan", "loanLimit", "pendingIn", "pendingOut"]) {
        expect(Number.isInteger(club.finance[k]), `${club.id}.finance.${k}`).toBe(true);
      }
      expect(club.finance.lastRound).toBeNull();
      expect(club.forSale).toEqual([]);
      for (const p of club.players) {
        expect(Number.isInteger(p.salary), `${p.id}.salary`).toBe(true);
        for (const k of ["fitness", "morale", "injuryRounds", "suspendedRounds", "yellowCards", "idleRounds"]) {
          expect(Number.isInteger(p[k])).toBe(true);
        }
      }
    }
    expect(doc.leagues[0].clubs[0].lineup.posture).toBe("balanced");
    expect(typeof doc.seed).toBe("number");
    expect(typeof doc.rngState).toBe("number");
    expect(doc.season).toBe(1);
    expect(doc.userClubId).toBe("c1");
    expect(Array.isArray(doc.leagues)).toBe(true);
    expect(doc.leagues).toHaveLength(2);
    expect(doc.market.freeAgents).toHaveLength(40);
    expect(doc.market.juniors).toHaveLength(3);
    expect(doc.market.offers).toEqual([]);
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

  test("carrega save v1 migrado", async () => {
    const db = await openDB(DB_NAME, DB_VERSION, { upgrade: (d) => d.createObjectStore(STORE) });
    await db.put(STORE, v1Document(), SLOT);
    db.close();
    const loaded = await loadGame();
    expect(loaded.kind).toBe("ok");
    if (loaded.kind !== "ok") return;
    expect(loaded.state.schemaVersion).toBe(4);
    expect(loaded.state.leagues[0]!.clubs[0]!.players[0]).toMatchObject({ fitness: 100, morale: 0, idleRounds: 0 });
  });
});

describe("histórico no save", () => {
  test("histórico gravado com duas temporadas", async () => {
    let state = newGame(43);
    state.userClubId = state.leagues[0]!.clubs[0]!.id;
    const season = () => {
      for (let r = 0; r < 38; r++) {
        const me = state.leagues.flatMap((l) => l.clubs).find((c) => c.id === state.userClubId)!;
        me.lineup = autoLineup(me, "4-4-2");
        state = playRound(state).state;
      }
      state.boardGoal = 20;
      state = nextSeason(state).state;
    };
    season();
    const first = JSON.parse(JSON.stringify(state.history[0]));
    season();
    await saveGame(state);
    const loaded = await loadGame();
    if (loaded.kind !== "ok") throw new Error("no save");
    expect(loaded.state.history.map((h) => h.season)).toEqual([1, 2]);
    expect(loaded.state.history[0]).toEqual(first);
    expect(loaded.state.history).toEqual(state.history);
  }, 60_000);
});

