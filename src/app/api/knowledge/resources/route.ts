import { api, readJson } from "@/server/http";
import { ResourceInputSchema, addResource, listResources } from "@/server/services/resources";

export const GET = api({ permission: "case.read" }, async (_req, auth) => ({ resources: await listResources(auth.orgId) }));

export const POST = api({ permission: "case.contribute", rpm: 30 }, async (req, auth) => ({
  resource: await addResource(auth, ResourceInputSchema.parse(await readJson(req))),
}));
