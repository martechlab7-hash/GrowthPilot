import "server-only";
import type { Firestore, Query } from "firebase-admin/firestore";
import type { Collection, CollectionName, DataStore, QueryOptions } from "./types";

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
        for (const [field, op, value] of opts.where ?? []) q = q.where(field, op, value);
        if (opts.orderBy) q = q.orderBy(opts.orderBy.field, opts.orderBy.direction);
        if (opts.limit) q = q.limit(opts.limit);
        const snap = await q.get();
        return snap.docs.map((d) => d.data() as T);
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
