import "server-only";
import path from "node:path";
import { env } from "../env";
import { adminDb } from "../firebaseAdmin";
import { FirestoreStore } from "./firestore";
import { MemoryStore } from "./memory";
import type { DataStore } from "./types";

// Cached on globalThis so dev-server hot reloads keep a single instance.
const g = globalThis as unknown as { __gpStore?: DataStore };

export function getStore(): DataStore {
  g.__gpStore ??= env.demoMode
    ? new MemoryStore(path.join(process.cwd(), ".data", "demo-db.json"))
    : new FirestoreStore(adminDb());
  return g.__gpStore;
}

/** Test hook. */
export function setStore(s: DataStore) {
  g.__gpStore = s;
}

export type { DataStore } from "./types";
