import { api } from "@/server/http";
import { runProviderTest } from "@/server/services/providers";

export const POST = api<{ pid: string }>({ permission: "org.manage", rpm: 10 }, (_req, auth, { pid }) =>
  runProviderTest(auth.orgId, pid),
);
