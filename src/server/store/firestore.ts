import "server-only";
import type { Firestore, Query } from "firebase-admin/firestore";
import { applyQuery } from "./query";
import type { Collection, CollectionName, DataStore, QueryOptions } from "./types";

/**
 * Set FIRESTORE_COMPOSITE_INDEXES=true after deploying firestore.indexes.json
 * to push ordering and range filters down to Firestore (needed at scale).
 */
const useCompositeIndexes = process.env.FIRESTORE_COMPOSITE_INDEXES === "true";
const MAX_SCAN = 10_000;

/** Production store backed by Cloud Firestore via the Admin SDK. */
export class FirestoreStore implements DataStore {
  constructor(private readonly db: Firestore) {}

  collection<T extends { id: string }>(name: CollectionName): Collection<T> {
    const col = this.db.collection(name);
    const db = this.db;
    return {
      async get(id) {
        const snap = await col.doc(id).get();
        return snap.exists ? (snap.data() as T) : null;
      },
      async set(doc) {
        await col.doc(doc.id).set(doc);
      },
      async update(id, patch) {
        await col.doc(id).update(patch as Record<string, unknown>);
      },
      async delete(id) {
        await col.doc(id).delete();
      },
      async query(opts: QueryOptions = {}) {
        let q: Query = col;
        if (useCompositeIndexes) {
          for (const [field, op, value] of opts.where ?? []) q = q.where(field, op, value);
          if (opts.orderBy) q = q.orderBy(opts.orderBy.field, opts.orderBy.direction);
          if (opts.limit) q = q.limit(opts.limit);
          return (await q.get()).docs.map((d) => d.data() as T);
        }
        // Equality filters on any number of fields need no composite index.
        // Range filters and ordering are applied in memory so a fresh project
        // works without deploying firestore.indexes.json.
        const equality = (opts.where ?? []).filter(([, op]) => op === "==");
        const rest = (opts.where ?? []).filter(([, op]) => op !== "==");
        for (const [field, op, value] of equality) q = q.where(field, op, value);
        const inMemory = rest.length > 0 || !!opts.orderBy;
        if (!inMemory && opts.limit) q = q.limit(opts.limit);
        else q = q.limit(MAX_SCAN);
        const rows = (await q.get()).docs.map((d) => d.data() as T);
        return inMemory ? applyQuery(rows, { where: rest, orderBy: opts.orderBy, limit: opts.limit }) : rows;
      },
      async transact(id, fn) {
        return db.runTransaction(async (tx) => {
          const ref = col.doc(id);
          const snap = await tx.get(ref);
          const next = fn(snap.exists ? (snap.data() as T) : null);
          if (next) tx.set(ref, next);
          return next;
        });
      },
    };
  }
}
