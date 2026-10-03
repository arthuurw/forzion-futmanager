import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { openDB } from "idb";
import { newGame } from "../engine/generate";
import { autoLineup } from "../engine/lineup";
import { nextSeason } from "../engine/rollover";
import { playRound } from "../engine/season";
import type { GameState } from "../engine/types";
import { v1Document } from "../engine/test-fixtures";
import { DB_NAME, DB_VERSION, SLOT, STORE, deleteGame, listSaves, loadGame, saveGame } from "./save";

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
    // Copa-continental (Superseded checks): v8 with the continental cup.
    expect(doc.schemaVersion).toBe(8);
    expect(doc.cups).toHaveLength(2);
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
    // Copa-continental (Superseded checks): v8 is current, so the first unknown version is 9.
    await db.put(STORE, { schemaVersion: 9 }, SLOT);
    db.close();
    expect(await loadGame()).toEqual({ kind: "incompatible", version: 9 });
  });

  test("carrega save v1 migrado", async () => {
    const db = await openDB(DB_NAME, DB_VERSION, { upgrade: (d) => d.createObjectStore(STORE) });
    await db.put(STORE, v1Document(), SLOT);
    db.close();
    const loaded = await loadGame();
    expect(loaded.kind).toBe("ok");
    if (loaded.kind !== "ok") return;
    // Gastos-da-ia (Superseded checks): v1 now reaches v6. Paises (Superseded checks): v7.
    expect(loaded.state.schemaVersion).toBe(8);
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
    expect(state.schemaVersion).toBe(8);
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

describe("save com países (paises)", () => {
  test("save v7 com países", async () => {
    // C31 (door 1): a user in the Liga Argentina, written and read back.
    const state = newGame(12);
    const club = state.leagues[2]!.clubs[4]!;
    state.userClubId = club.id;
    club.lineup = autoLineup(club, "4-4-2");
    const expected = JSON.parse(JSON.stringify(state)) as GameState;
    await saveGame(state);
    const loaded = await loadGame();
    expect(loaded.kind).toBe("ok");
    if (loaded.kind !== "ok") return;
    expect(loaded.state).toEqual(expected);
    expect(loaded.state.schemaVersion).toBe(8);
    expect(loaded.state.userClubId).toBe(club.id);
    expect(loaded.state.leagues.map((l) => [l.id, l.country, l.tier])).toEqual([
      ["l1", "BR", 0],
      ["l2", "BR", 1],
      ["l3", "AR", 0],
      ["l4", "PT", 0],
    ]);
  });
});

describe("save com a continental (copa-continental)", () => {
  test("save v8 com as duas copas", async () => {
    // C27 (door 1).
    await saveGame(newGame(13));
    const loaded = await loadGame();
    expect(loaded.kind).toBe("ok");
    if (loaded.kind !== "ok") return;
    expect(loaded.state.schemaVersion).toBe(8);
    expect(loaded.state.cups.map((c) => c.id)).toEqual(["cup-nat", "cup-cont"]);
  });
});


describe("vários espaços (varios-saves)", () => {
  async function raw(key: string): Promise<unknown> {
    const db = await openDB(DB_NAME, DB_VERSION, { upgrade: (d) => d.createObjectStore(STORE) });
    const doc: unknown = await db.get(STORE, key);
    db.close();
    return doc;
  }

  async function put(key: string, doc: unknown): Promise<void> {
    const db = await openDB(DB_NAME, DB_VERSION, { upgrade: (d) => d.createObjectStore(STORE) });
    await db.put(STORE, doc, key);
    db.close();
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("grava no espaço com savedAt", async () => {
    // C1 (door 1, door 2): only "slot-2" changes, and its document carries the time of the write.
    const first = fixture();
    await put("slot-1", { ...first, savedAt: 5 });
    const second = newGame(12);
    vi.spyOn(Date, "now").mockReturnValue(1700000000000);
    await saveGame(second, 2);
    expect(await raw("slot-2")).toEqual({ ...second, savedAt: 1700000000000 });
    expect(await raw("slot-1")).toEqual({ ...first, savedAt: 5 });
    expect(await raw("slot-3")).toBeUndefined();
  });

  test("leitura tira o savedAt", async () => {
    // C2: the game read back is the game written, without the time; no number = "slot-1".
    const game = newGame(12);
    await saveGame(game, 2);
    const loaded = await loadGame(2);
    expect(loaded).toEqual({ kind: "ok", state: game });
    if (loaded.kind === "ok") expect("savedAt" in loaded.state).toBe(false);
    expect(await loadGame()).toEqual({ kind: "none" });
    await saveGame(fixture());
    expect(await loadGame()).toEqual({ kind: "ok", state: fixture() });
  });

  test("lista dos espaços", async () => {
    // C3 (L-005): a readable game, an empty key, an unsupported version, and a game with no time.
    const game = fixture();
    await put("slot-1", { ...game, savedAt: 100 });
    await put("slot-3", { schemaVersion: 9 });
    expect(await listSaves()).toEqual([
      { slot: 1, kind: "ok", state: game, savedAt: 100 },
      { slot: 2, kind: "empty" },
      { slot: 3, kind: "incompatible", version: 9 },
    ]);
    await put("slot-2", game);
    expect((await listSaves())[1]).toEqual({ slot: 2, kind: "ok", state: game, savedAt: 0 });
  });

  test("apaga um espaço", async () => {
    // C4.
    const [a, b, c] = [fixture(), newGame(12), newGame(13)];
    await saveGame(a, 1);
    await saveGame(b, 2);
    await saveGame(c, 3);
    const [one, three] = [await raw("slot-1"), await raw("slot-3")];
    await deleteGame(2);
    expect(await raw("slot-2")).toBeUndefined();
    expect(await raw("slot-1")).toEqual(one);
    expect(await raw("slot-3")).toEqual(three);
  });
});

describe("empréstimo no save (emprestimos)", () => {
  test("empréstimo atravessa o save", async () => {
    // C16 (door 1): two players on loan, one each way, saved and read unchanged.
    const state = fixture();
    const [me, x] = [state.leagues[0]!.clubs[0]!, state.leagues[0]!.clubs[3]!];
    const out = me.players.pop()!;
    x.players.push({ ...out, loanFrom: me.id });
    const inn = x.players.shift()!;
    me.players.push({ ...inn, loanFrom: x.id });
    await saveGame(state);
    expect(await loadGame()).toEqual({ kind: "ok", state });
  });
});

describe("notícias no save (noticias)", () => {
  test("notícias atravessam o save", async () => {
    // C12 (door 1): saved and read unchanged.
    const state = fixture();
    const x = state.leagues[0]!.clubs[4]!.id;
    state.news = [{ season: 1, date: { kind: "league", round: 3 }, kind: "injury", playerName: "Fulano", rounds: 2 }, { season: 1, date: { kind: "league", round: 3 }, kind: "job", clubIds: [x] }];
    await saveGame(state);
    expect(await loadGame()).toEqual({ kind: "ok", state });
  });
});
