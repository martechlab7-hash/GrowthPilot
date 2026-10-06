import { api, readJson } from "@/server/http";
import { ProviderInputSchema, deleteProvider, updateProvider } from "@/server/services/providers";
import { audit } from "@/server/services/org";

type P = { pid: string };

export const PATCH = api<P>({ permission: "org.manage", rpm: 30 }, async (req, auth, { pid }) => {
  const provider = await updateProvider(auth.orgId, pid, ProviderInputSchema.partial().parse(await readJson(req)));
  await audit(auth.orgId, auth.uid, "ai_provider.update", pid);
  return { provider };
});

export const DELETE = api<P>({ permission: "org.manage" }, async (_req, auth, { pid }) => {
  await deleteProvider(auth.orgId, pid);
  await audit(auth.orgId, auth.uid, "ai_provider.delete", pid);
  return { deleted: true };
});
