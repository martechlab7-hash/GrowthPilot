import "server-only";
import { z } from "zod";
import * as agents from "@/ai/agents";
import type { Case } from "@/domain/types";
import type { AuthContext } from "../auth";
import { HttpError, notFound } from "../errors";
import { getStore } from "../store";
import { withAiForChat } from "./cases";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: string[];
  outOfScope?: boolean;
  followUps?: string[];
  createdAt: string;
  createdBy?: string;
}

interface CaseChat {
  id: string; // = caseId
  organizationId: string;
  caseId: string;
  messages: ChatMessage[];
  updatedAt: string;
}

export const ChatInputSchema = z.object({ message: z.string().trim().min(2).max(2000) });

const col = () => getStore().collection<CaseChat>("case_chats");
const MAX_MESSAGES = 200;

/** Chat unlocks once the strategy report exists (the case is complete). */
export function chatAvailable(c: Case) {
  return !!c.report;
}

async function loadCase(auth: AuthContext, caseId: string) {
  const c = await getStore().collection<Case>("cases").get(caseId);
  if (!c || c.organizationId !== auth.orgId) throw notFound("Case");
  return c;
}

export async function getChat(auth: AuthContext, caseId: string) {
  const c = await loadCase(auth, caseId);
  const chat = await col().get(caseId);
  return { available: chatAvailable(c), messages: chat?.organizationId === auth.orgId ? chat.messages : [] };
}

export async function askCase(auth: AuthContext, caseId: string, message: string) {
  const c = await loadCase(auth, caseId);
  if (!chatAvailable(c)) {
    throw new HttpError(409, "The case assistant unlocks once the strategy report has been generated.", "CHAT_LOCKED");
  }
  const existing = (await col().get(caseId))?.messages ?? [];
  const now = () => new Date().toISOString();
  const userMsg: ChatMessage = { id: `msg_${crypto.randomUUID().slice(0, 10)}`, role: "user", content: message, createdAt: now(), createdBy: auth.uid };

  const out = await withAiForChat(auth, c, (deps) =>
    agents.answerCaseQuestion(deps, c, existing.map((m) => ({ role: m.role, content: m.content })), message),
  );
  const reply: ChatMessage = {
    id: `msg_${crypto.randomUUID().slice(0, 10)}`,
    role: "assistant",
    content: out.answer,
    citations: out.citations,
    outOfScope: out.outOfScope,
    followUps: out.followUps,
    createdAt: now(),
  };
  const saved = await col().transact(caseId, (cur) => ({
    id: caseId,
    organizationId: auth.orgId,
    caseId,
    messages: [...(cur?.messages ?? []), userMsg, reply].slice(-MAX_MESSAGES),
    updatedAt: now(),
  }));
  return { available: true, messages: saved?.messages ?? [userMsg, reply] };
}

export async function clearChat(auth: AuthContext, caseId: string) {
  await loadCase(auth, caseId);
  await col().delete(caseId);
  return { available: true, messages: [] as ChatMessage[] };
}
