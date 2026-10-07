import { api, readJson } from "@/server/http";
import { ShareInputSchema, revokeShare, shareReport } from "@/server/services/cases";

/** Create or rotate the read-only report link. */
export const POST = api<{ id: string }>({ permission: "case.manage", rpm: 10 }, async (req, auth, { id }) =>
  shareReport(auth, id, ShareInputSchema.parse(await readJson(req))),
);

/** Revoke the link: it stops working immediately. */
export const DELETE = api<{ id: string }>({ permission: "case.manage", rpm: 10 }, (_req, auth, { id }) => revokeShare(auth, id));
