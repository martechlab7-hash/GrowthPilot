import { beforeEach, describe, expect, it } from "vitest";
import type { UserProfile } from "@/domain/types";
import { MemoryStore } from "../store/memory";
import { setStore } from "../store";
import type { AuthContext } from "../auth";
import { ResourceInputSchema, addResource, deleteResource, listResources, resourcesForAgents } from "./resources";

const now = new Date().toISOString();
const mk = (uid: string, orgId: string, role: UserProfile["role"]): AuthContext => ({
  uid, email: `${uid}@x.io`, name: uid, orgId,
  profile: { id: uid, organizationId: orgId, email: `${uid}@x.io`, displayName: uid, role, createdAt: now, updatedAt: now },
});
const analyst = mk("a1", "o1", "analyst");
const other = mk("a2", "o1", "analyst");
const strategist = mk("s1", "o1", "strategist");
const outsider = mk("x1", "o2", "owner");

describe("knowledge resources", () => {
  beforeEach(() => setStore(new MemoryStore(undefined, true)));

  it("adds, lists per tenant, feeds agents and enforces delete rights", async () => {
    const r = await addResource(analyst, ResourceInputSchema.parse({ title: "Retention playbook", url: "https://wiki.acme.io/retention", tags: ["CRM", "crm"], notes: "Offer ladder" }));
    expect(r.tags).toEqual(["crm"]);
    await expect(addResource(analyst, { title: "Dup", url: "https://wiki.acme.io/retention" })).rejects.toMatchObject({ status: 400 });
    expect(await listResources("o2")).toHaveLength(0);
    expect(await resourcesForAgents("o1")).toContain("Retention playbook (https://wiki.acme.io/retention) [crm] — Offer ladder");
    expect(await resourcesForAgents("o2")).toBeUndefined();

    await expect(deleteResource(outsider, r.id)).rejects.toMatchObject({ status: 404 });
    await expect(deleteResource(other, r.id)).rejects.toMatchObject({ status: 403 });
    await deleteResource(strategist, r.id);
    expect(await listResources("o1")).toHaveLength(0);
  });

  it("rejects non-http links", () => {
    expect(() => ResourceInputSchema.parse({ title: "Bad", url: "javascript:alert(1)" })).toThrow();
  });
});
