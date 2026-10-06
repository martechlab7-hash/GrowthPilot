import { api, readJson } from "@/server/http";
import { ProviderInputSchema, runAdHocTest } from "@/server/services/providers";

/** Test credentials before saving. Nothing is persisted. */
export const POST = api({ permission: "org.manage", rpm: 10 }, async (req) =>
  runAdHocTest(ProviderInputSchema.parse(await readJson(req))),
);
