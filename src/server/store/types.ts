export type WhereClause = [field: string, op: "==" | ">=" | "<=", value: unknown];

export interface QueryOptions {
  where?: WhereClause[];
  orderBy?: { field: string; direction: "asc" | "desc" };
  limit?: number;
}

export interface Collection<T extends { id: string }> {
  get(id: string): Promise<T | null>;
  set(doc: T): Promise<void>;
  update(id: string, patch: Partial<T>): Promise<void>;
  delete(id: string): Promise<void>;
  query(opts?: QueryOptions): Promise<T[]>;
  /** Atomic read-modify-write. Return null from fn to abort without writing. */
  transact(id: string, fn: (current: T | null) => T | null): Promise<T | null>;
}

export const COLLECTIONS = [
  "organizations",
  "users",
  "cases",
  "case_versions",
  "decision_logs",
  "ai_providers",
  "ai_usage",
  "audit_logs",
  "brand_profiles",
  "usage_counters",
  "case_activity",
  "case_chats",
] as const;
export type CollectionName = (typeof COLLECTIONS)[number];

export interface DataStore {
  collection<T extends { id: string }>(name: CollectionName): Collection<T>;
}
