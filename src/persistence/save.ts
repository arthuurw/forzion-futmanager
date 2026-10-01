import { openDB, type IDBPDatabase } from "idb";
import { migrateSave } from "../engine/migrate";
import type { GameState } from "../engine/types";

// Door 1: one document per slot. Door 1 (varios-saves): up to 3 slots, "slot-1" being the save
// from before that feature.
export const DB_NAME = "forzion-futmanager";
export const DB_VERSION = 1;
export const STORE = "saves";
export const SLOT_COUNT = 3;
export const slotKey = (slot: number): string => `slot-${slot}`;
export const SLOT = slotKey(1);

export function isStorageAvailable(): boolean {
  return typeof indexedDB !== "undefined" && indexedDB !== null;
}

async function open(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore(STORE);
    },
  });
}

/**
 * Writes the whole document in a single put, in `slot`. Door 2 (varios-saves): the stored document
 * carries `savedAt` (ms) next to the game's fields; reads take it off. Rejects when IndexedDB is
 * unavailable or the put fails.
 */
export async function saveGame(state: GameState, slot = 1): Promise<void> {
  if (!isStorageAvailable()) throw new Error("IndexedDB unavailable");
  const db = await open();
  try {
    await db.put(STORE, { ...state, savedAt: Date.now() }, slotKey(slot));
  } finally {
    db.close();
  }
}

export type LoadResult =
  | { kind: "none" }
  | { kind: "ok"; state: GameState }
  | { kind: "incompatible"; version: unknown };

/** The game of a stored document and its `savedAt` (0 when absent: a save from before varios-saves). */
function read(doc: unknown): { result: LoadResult; savedAt: number } {
  if (doc === undefined) return { result: { kind: "none" }, savedAt: 0 };
  let savedAt = 0;
  let game = doc;
  if (typeof doc === "object" && doc !== null && "savedAt" in doc) {
    const { savedAt: at, ...rest } = doc as { savedAt: unknown };
    savedAt = typeof at === "number" ? at : 0;
    game = rest;
  }
  return { result: migrateSave(game), savedAt };
}

export async function loadGame(slot = 1): Promise<LoadResult> {
  if (!isStorageAvailable()) throw new Error("IndexedDB unavailable");
  const db = await open();
  try {
    return read(await db.get(STORE, slotKey(slot))).result;
  } finally {
    db.close();
  }
}

export type SlotEntry =
  | { slot: number; kind: "empty" }
  | { slot: number; kind: "ok"; state: GameState; savedAt: number }
  | { slot: number; kind: "incompatible"; version: unknown };

/** Every slot, in order, read in one transaction. */
export async function listSaves(): Promise<SlotEntry[]> {
  if (!isStorageAvailable()) throw new Error("IndexedDB unavailable");
  const db = await open();
  try {
    const tx = db.transaction(STORE, "readonly");
    const slots = Array.from({ length: SLOT_COUNT }, (_, i) => i + 1);
    const docs = await Promise.all(slots.map((slot) => tx.store.get(slotKey(slot))));
    await tx.done;
    return slots.map((slot, i): SlotEntry => {
      const { result, savedAt } = read(docs[i]);
      if (result.kind === "ok") return { slot, kind: "ok", state: result.state, savedAt };
      if (result.kind === "incompatible") return { slot, kind: "incompatible", version: result.version };
      return { slot, kind: "empty" };
    });
  } finally {
    db.close();
  }
}

/** Removes the document of `slot`. */
export async function deleteGame(slot: number): Promise<void> {
  if (!isStorageAvailable()) throw new Error("IndexedDB unavailable");
  const db = await open();
  try {
    await db.delete(STORE, slotKey(slot));
  } finally {
    db.close();
  }
}
