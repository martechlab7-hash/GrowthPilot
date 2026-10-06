import { NextResponse } from "next/server";
import { api } from "@/server/http";
import { exportCaseData } from "@/server/services/cases";

/** Data portability: full case export as JSON. */
export const GET = api<{ id: string }>({ permission: "case.read", rpm: 10 }, async (_req, auth, { id }) => {
  const data = await exportCaseData(auth, id);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: { "content-type": "application/json", "content-disposition": `attachment; filename="case-${id}.json"`, "cache-control": "private, no-store" },
  });
});
