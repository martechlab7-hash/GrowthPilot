import { api, readJson } from "@/server/http";
import { ChatInputSchema, askCase, clearChat, getChat } from "@/server/services/chat";

type P = { id: string };

export const maxDuration = 120;

export const GET = api<P>({ permission: "case.read" }, (_req, auth, { id }) => getChat(auth, id));

/** Ask the case assistant a question (answers only from this case). */
export const POST = api<P>({ permission: "case.read", rpm: 20 }, async (req, auth, { id }) =>
  askCase(auth, id, ChatInputSchema.parse(await readJson(req)).message),
);

export const DELETE = api<P>({ permission: "case.contribute" }, (_req, auth, { id }) => clearChat(auth, id));
