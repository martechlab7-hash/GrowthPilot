import type { QueryOptions, WhereClause } from "./types";

type Row = Record<string, unknown>;

/** Apply filters, ordering and limit in memory (shared by both stores). */
export function applyQuery<T>(rows: T[], opts: Pick<QueryOptions, "orderBy" | "limit"> & { where?: WhereClause[] }): T[] {
  let out = rows;
  for (const [field, op, value] of opts.where ?? []) {
    out = out.filter((r) => {
      const v = (r as Row)[field] as string | number;
      if (op === "==") return v === value;
      if (op === ">=") return v >= (value as string | number);
      return v <= (value as string | number);
    });
  }
  if (opts.orderBy) {
    const { field, direction } = opts.orderBy;
    out = [...out].sort((a, b) => {
      const av = (a as Row)[field] as string | number;
      const bv = (b as Row)[field] as string | number;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return direction === "asc" ? cmp : -cmp;
    });
  }
  return opts.limit ? out.slice(0, opts.limit) : out;
}
