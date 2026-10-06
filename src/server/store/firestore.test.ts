import { describe, expect, it } from "vitest";
import type { Firestore } from "firebase-admin/firestore";
import { FirestoreStore } from "./firestore";

type Doc = { id: string; organizationId: string; caseId: string; createdAt: string };

/** Minimal fake that records which clauses reach Firestore. */
function fakeDb(rows: Doc[]) {
  const calls: string[] = [];
  const query = (filters: [string, unknown][], limit?: number) => ({
    where(field: string, op: string, value: unknown) {
      calls.push(`where ${field} ${op}`);
      return query([...filters, [field, value]], limit);
    },
    orderBy(field: string) {
      calls.push(`orderBy ${field}`);
      return query(filters, limit);
    },
    limit(n: number) {
      calls.push(`limit ${n}`);
      return query(filters, n);
    },
    async get() {
      const docs = rows.filter((r) => filters.every(([f, v]) => (r as Record<string, unknown>)[f] === v)).slice(0, limit);
      return { docs: docs.map((d) => ({ data: () => d })) };
    },
  });
  return { calls, db: { collection: () => query([]) } as unknown as Firestore };
}

describe("FirestoreStore without composite indexes", () => {
  const rows: Doc[] = [
    { id: "a", organizationId: "o1", caseId: "c1", createdAt: "2026-01-01" },
    { id: "b", organizationId: "o1", caseId: "c1", createdAt: "2026-03-01" },
    { id: "c", organizationId: "o1", caseId: "c2", createdAt: "2026-02-01" },
    { id: "d", organizationId: "o2", caseId: "c1", createdAt: "2026-04-01" },
  ];

  it("sends only equality filters and sorts/limits in memory", async () => {
    const { calls, db } = fakeDb(rows);
    const out = await new FirestoreStore(db).collection<Doc>("case_versions").query({
      where: [["organizationId", "==", "o1"], ["createdAt", ">=", "2026-02-01"]],
      orderBy: { field: "createdAt", direction: "desc" },
      limit: 1,
    });
    expect(calls.some((c) => c.startsWith("orderBy") || c.includes(">="))).toBe(false);
    expect(out.map((r) => r.id)).toEqual(["b"]);
  });

  it("pushes limit down when no in-memory step is needed", async () => {
    const { calls, db } = fakeDb(rows);
    const out = await new FirestoreStore(db).collection<Doc>("cases").query({ where: [["organizationId", "==", "o1"], ["caseId", "==", "c1"]], limit: 5 });
    expect(calls).toEqual(["where organizationId ==", "where caseId ==", "limit 5"]);
    expect(out).toHaveLength(2);
  });
});
