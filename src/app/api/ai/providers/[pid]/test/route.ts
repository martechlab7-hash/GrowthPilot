import { api } from "@/server/http";
import { ProviderInputSchema, runProviderTest } from "@/server/services/providers";

/** Test a saved provider; a body with edits tests unsaved settings (stored key unless a new one is given). */
export const POST = api<{ pid: string }>({ permission: "org.manage", rpm: 10 }, async (req, auth, { pid }) => {
  const text = await req.text();
  const edits = text.trim() ? ProviderInputSchema.omit({ kind: true }).partial().parse(JSON.parse(text)) : undefined;
  return runProviderTest(auth.orgId, pid, edits);
});
