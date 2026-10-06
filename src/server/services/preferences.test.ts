import { beforeEach, describe, expect, it } from "vitest";
import type { UserProfile } from "@/domain/types";
import { MemoryStore } from "../store/memory";
import { getStore, setStore } from "../store";
import { updatePreferences } from "./org";
import type { AuthContext } from "../auth";

const now = new Date().toISOString();
const profile: UserProfile = { id: "u1", organizationId: "o1", email: "a@b.c", displayName: "A", role: "analyst", createdAt: now, updatedAt: now };
const auth: AuthContext = { uid: "u1", email: "a@b.c", name: "A", profile, orgId: "o1" };

describe("user preferences", () => {
  beforeEach(async () => {
    setStore(new MemoryStore(undefined, true));
    await getStore().collection<UserProfile>("users").set(profile);
  });

  it("saves a known mascot (any role) and rejects unknown ones", async () => {
    const me = await updatePreferences(auth, { mascot: "fox" });
    expect(me.onboarded && me.profile.mascot).toBe("fox");
    expect((await getStore().collection<UserProfile>("users").get("u1"))!.mascot).toBe("fox");
    await updatePreferences(auth, { mascot: "none" });
    await expect(updatePreferences(auth, { mascot: "kamran" })).rejects.toMatchObject({ status: 400 });
  });
});
