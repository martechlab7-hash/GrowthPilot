import { api } from "@/server/http";
import { debate } from "@/server/services/cases";

export const maxDuration = 300;

/** Re-run the devil's-advocate debate on the current hypotheses. */
export const POST = api<{ id: string }>({ permission: "case.contribute", rpm: 10 }, (_req, auth, { id }) => debate(auth, id));
