import { api } from "@/server/http";
import { CompetitorsSchema, research } from "@/server/services/strategy";

export const maxDuration = 300;

export const POST = api<{ id: string }>({ permission: "case.manage", rpm: 6 }, async (req, auth, { id }) => {
  const text = await req.text();
  return research(auth, id, text.trim() && text.trim() !== "{}" ? CompetitorsSchema.parse(JSON.parse(text)) : undefined);
});
