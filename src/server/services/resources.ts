import "server-only";
import { z } from "zod";
import type { AuthContext } from "../auth";
import { badRequest, forbidden, notFound } from "../errors";
import { can } from "../permissions";
import { getStore } from "../store";
import { audit } from "./org";

/** A user-supplied reference link in the organization's knowledge base. */
export interface KnowledgeResource {
  id: string;
  organizationId: string;
  title: string;
  url: string;
  notes?: string;
  tags: string[];
  createdBy: string;
  createdAt: string;
}

const MAX_RESOURCES = 200;

export const ResourceInputSchema = z.object({
  title: z.string().trim().min(2).max(140),
  url: z
    .string()
    .trim()
    .max(2000)
    .url()
    .refine((u) => /^https?:\/\//i.test(u), "Only http(s) links are allowed"),
  notes: z.string().trim().max(1000).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(8).optional(),
});

const col = () => getStore().collection<KnowledgeResource>("knowledge_resources");

export async function listResources(orgId: string): Promise<KnowledgeResource[]> {
  const rows = await col().query({ where: [["organizationId", "==", orgId]] });
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addResource(auth: AuthContext, input: z.infer<typeof ResourceInputSchema>) {
  const existing = await listResources(auth.orgId);
  if (existing.length >= MAX_RESOURCES) throw badRequest(`The knowledge base holds up to ${MAX_RESOURCES} links. Remove some first.`);
  if (existing.some((r) => r.url === input.url)) throw badRequest("That link is already in the knowledge base.");
  const tags = [...new Set((input.tags ?? []).map((t) => t.toLowerCase()))];
  const doc: KnowledgeResource = {
    id: `res_${crypto.randomUUID().slice(0, 12)}`,
    organizationId: auth.orgId,
    title: input.title,
    url: input.url,
    ...(input.notes ? { notes: input.notes } : {}),
    tags,
    createdBy: auth.uid,
    createdAt: new Date().toISOString(),
  };
  await col().set(doc);
  await audit(auth.orgId, auth.uid, "knowledge.resource.add", doc.id);
  return doc;
}

export async function deleteResource(auth: AuthContext, id: string) {
  const doc = await col().get(id);
  if (!doc || doc.organizationId !== auth.orgId) throw notFound("Resource");
  const mayManage = !!auth.profile && can(auth.profile.role, "case.manage");
  if (doc.createdBy !== auth.uid && !mayManage) throw forbidden("Only the person who added this link or a strategist can remove it.");
  await col().delete(id);
  await audit(auth.orgId, auth.uid, "knowledge.resource.delete", id);
}

/**
 * Compact text block for AI agents. Links are listed as user-supplied
 * references only: the platform never fetches them, so agents must not claim
 * to know what they contain beyond the title and notes.
 */
export async function resourcesForAgents(orgId: string): Promise<string | undefined> {
  const rows = (await listResources(orgId)).slice(0, 30);
  if (!rows.length) return undefined;
  return rows
    .map((r) => `- ${r.title} (${r.url})${r.tags.length ? ` [${r.tags.join(", ")}]` : ""}${r.notes ? ` — ${r.notes}` : ""}`)
    .join("\n");
}
