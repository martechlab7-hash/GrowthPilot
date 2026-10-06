import { api, readJson } from "@/server/http";
import { ProviderInputSchema, createProvider, listProviders, toPublic } from "@/server/services/providers";
import { audit } from "@/server/services/org";

export const GET = api({ permission: "case.read" }, async (_req, auth) => ({
  providers: (await listProviders(auth.orgId)).map(toPublic),
}));

export const POST = api({ permission: "org.manage", rpm: 20 }, async (req, auth) => {
  const provider = await createProvider(auth.orgId, auth.uid, ProviderInputSchema.parse(await readJson(req)));
  await audit(auth.orgId, auth.uid, "ai_provider.create", provider.id, { kind: provider.kind });
  return { provider };
});
