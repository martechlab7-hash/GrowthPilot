import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { Collection, CollectionName, DataStore, QueryOptions } from "./types";

type Row = { id: string } & Record<string, unknown>;

/**
 * Local store for demo mode and tests. Optionally persisted to a JSON file so
 * a local demo survives restarts. Not for production use.
 */
export class MemoryStore implements DataStore {
  private data = new Map<string, Map<string, Row>>();
  private flushTimer: NodeJS.Timeout | undefined;

  constructor(private readonly file?: string) {
    if (file && fs.existsSync(file)) {
      const raw = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, Row[]>;
      for (const [name, rows] of Object.entries(raw)) {
        this.data.set(name, new Map(rows.map((r) => [r.id, r])));
      }
    }
  }

  private table(name: string) {
    let t = this.data.get(name);
    if (!t) {
      t = new Map();
      this.data.set(name, t);
    }
    return t;
  }

  private scheduleFlush() {
    if (!this.file) return;
    clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => {
      const out: Record<string, Row[]> = {};
      for (const [name, rows] of this.data) out[name] = [...rows.values()];
      fs.mkdirSync(path.dirname(this.file!), { recursive: true });
      fs.writeFileSync(this.file!, JSON.stringify(out));
    }, 200);
  }

  collection<T extends { id: string }>(name: CollectionName): Collection<T> {
    const table = () => this.table(name);
    const clone = <X>(x: X): X => structuredClone(x);
    const flush = () => this.scheduleFlush();
    return {
      async get(id) {
        const row = table().get(id);
        return row ? (clone(row) as unknown as T) : null;
      },
      async set(doc) {
        table().set(doc.id, clone(doc) as unknown as Row);
        flush();
      },
      async update(id, patch) {
        const row = table().get(id);
        if (!row) throw new Error(`Document ${name}/${id} not found`);
        table().set(id, { ...row, ...clone(patch) } as Row);
        flush();
      },
      async delete(id) {
        table().delete(id);
        flush();
      },
      async query(opts: QueryOptions = {}) {
        let rows = [...table().values()];
        for (const [field, op, value] of opts.where ?? []) {
          rows = rows.filter((r) => {
            const v = r[field] as string | number;
            if (op === "==") return v === value;
            if (op === ">=") return v >= (value as string | number);
            return v <= (value as string | number);
          });
        }
        if (opts.orderBy) {
          const { field, direction } = opts.orderBy;
          rows.sort((a, b) => {
            const av = a[field] as string | number;
            const bv = b[field] as string | number;
            const cmp = av < bv ? -1 : av > bv ? 1 : 0;
            return direction === "asc" ? cmp : -cmp;
          });
        }
        if (opts.limit) rows = rows.slice(0, opts.limit);
        return rows.map((r) => clone(r) as unknown as T);
      },
      async transact(id, fn) {
        const current = table().get(id);
        const next = fn(current ? (clone(current) as unknown as T) : null);
        if (next) {
          table().set(id, clone(next) as unknown as Row);
          flush();
        }
        return next;
      },
    };
  }
}
