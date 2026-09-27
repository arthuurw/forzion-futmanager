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
  // Copa-nacional C56 supersedes multiplas-temporadas C51: the document is v5, with the cup.
  // Gastos-da-ia (Superseded checks): the document is v6. Paises (Superseded checks): v7.
  test("documento tem schemaVersion 5 com copa", async () => {
    const state = fixture();
    const club = state.leagues[0]!.clubs[0]!;
    club.lineup = autoLineup(club, "4-4-2");
    await saveGame(state);
    const db = await openDB(DB_NAME, DB_VERSION);
    const doc = await db.get(STORE, SLOT);
    db.close();
    expect(DB_NAME).toBe("forzion-futmanager");
    expect(STORE).toBe("saves");
    expect(SLOT).toBe("slot-1");
    expect(doc.schemaVersion).toBe(7);
    expect(doc.cups).toHaveLength(1);
    expect(doc.cups[0].id).toBe("cup-nat");
    expect(doc.cups[0].seeding).toHaveLength(40);
    expect(doc.cups[0].phases).toHaveLength(6);
    expect(doc.cups[0].phases[0].ties).toHaveLength(8);
    expect(typeof doc.cupGoal).toBe("number");
    const everyPlayer = [
      ...doc.leagues.flatMap((l: { clubs: { players: unknown[] }[] }) => l.clubs.flatMap((c) => c.players)),
      ...doc.market.freeAgents,
      ...doc.market.juniors,
    ] as { id: string; cupDiscipline: unknown }[];
    expect(everyPlayer.length).toBeGreaterThan(900);
    for (const p of everyPlayer) expect(p.cupDiscipline, p.id).toEqual({});
    // Paises (Superseded checks): 4 leagues.
    expect(doc.leagues.map((l: { id: string }) => l.id)).toEqual(["l1", "l2", "l3", "l4"]);
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
    expect(doc.leagues).toHaveLength(4);
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
    // Paises (Superseded checks): v7 is current, so the first unknown version is 8.
    await db.put(STORE, { schemaVersion: 8 }, SLOT);
    db.close();
    expect(await loadGame()).toEqual({ kind: "incompatible", version: 8 });
  });

  test("carrega save v1 migrado", async () => {
    const db = await openDB(DB_NAME, DB_VERSION, { upgrade: (d) => d.createObjectStore(STORE) });
    await db.put(STORE, v1Document(), SLOT);
    db.close();
    const loaded = await loadGame();
    expect(loaded.kind).toBe("ok");
    if (loaded.kind !== "ok") return;
    // Gastos-da-ia (Superseded checks): v1 now reaches v6. Paises (Superseded checks): v7.
    expect(loaded.state.schemaVersion).toBe(7);
    expect(loaded.state.leagues[0]!.clubs[0]!.players[0]).toMatchObject({ fitness: 100, morale: 0, idleRounds: 0 });
  });
});

describe("boletim no save (gastos-da-ia)", () => {
  test("boletim sobrevive ao save", async () => {
    const state = fixture();
    const [a, b] = [state.leagues[0]!.clubs[3]!, state.leagues[1]!.clubs[5]!];
    const moved = b.players[4]!;
    state.market.transfers = [
      { round: 1, kind: "buy", playerId: moved.id, playerName: moved.name, fromId: b.id, toId: a.id, amount: 1_990_000 },
      { round: 1, kind: "release", playerId: a.players[7]!.id, playerName: a.players[7]!.name, fromId: a.id, toId: null, amount: 88_000 },
    ];
    expect(state.schemaVersion).toBe(7);
    const lines = JSON.parse(JSON.stringify(state.market.transfers));
    await saveGame(state);
    const loaded = await loadGame();
    expect(loaded.kind).toBe("ok");
    if (loaded.kind !== "ok") return;
    expect(loaded.state.market.transfers).toHaveLength(2);
    expect(loaded.state.market.transfers).toEqual(lines);
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


describe("copa no save (copa-nacional)", () => {
  test("reload no meio da copa não muda nada", async () => {
    let state = fixture();
    for (let r = 0; r < 5; r++) state = playRound(state).state;
    expect(state.cups[0]!.currentPhase).toBe(1);
    await saveGame(state);
    const loaded = await loadGame();
    if (loaded.kind !== "ok") throw new Error("no save");
    const finish = (s: GameState) => {
      let x = s;
      for (let r = 5; r < 38; r++) x = playRound(x).state;
      return x;
    };
    const straight = finish(state);
    const reloaded = finish(loaded.state);
    expect(straight.cups[0]!.currentPhase).toBe(6);
    expect(reloaded.cups).toEqual(straight.cups);
    expect(reloaded).toEqual(straight);
  }, 60_000);
});
