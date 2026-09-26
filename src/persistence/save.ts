import { openDB, type IDBPDatabase } from "idb";
import { migrateSave } from "../engine/migrate";
import type { GameState } from "../engine/types";

// Door 1: one document, one slot.
export const DB_NAME = "brasfoot";
export const DB_VERSION = 1;
export const STORE = "saves";
export const SLOT = "slot-1";

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

/** Writes the whole document in a single put. Rejects when IndexedDB is unavailable or the put fails. */
export async function saveGame(state: GameState): Promise<void> {
  if (!isStorageAvailable()) throw new Error("IndexedDB unavailable");
  const db = await open();
  try {
    await db.put(STORE, state, SLOT);
  } finally {
    db.close();
  }
}

export type LoadResult =
  | { kind: "none" }
  | { kind: "ok"; state: GameState }
  | { kind: "incompatible"; version: unknown };

export async function loadGame(): Promise<LoadResult> {
  if (!isStorageAvailable()) throw new Error("IndexedDB unavailable");
  const db = await open();
  try {
    const doc: unknown = await db.get(STORE, SLOT);
    if (doc === undefined) return { kind: "none" };
    return migrateSave(doc);
  } finally {
    db.close();
  }
}
