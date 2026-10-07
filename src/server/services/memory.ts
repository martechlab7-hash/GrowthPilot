import "server-only";
import type { Case } from "@/domain/types";
import { getStore } from "../store";

/**
 * Organisation memory: what past cases found and what their recommendations
 * actually delivered. Used to calibrate forecasts and to surface precedent.
 */
const cases = () => getStore().collection<Case>("cases");

export interface TrackRecord {
  completed: number;
  /** Average of actual ÷ forecast lift across completed initiatives with both values. */
  ratio: number | null;
  /** Share of completed initiatives that met or beat their forecast. */
  hitRate: number | null;
  examples: { caseName: string; title: string; forecast: number; actual: number }[];
}

export async function trackRecord(orgId: string): Promise<TrackRecord> {
  const rows = await cases().query({ where: [["organizationId", "==", orgId]] });
  const done = rows.flatMap((c) =>
    c.recommendations
      .filter((r) => r.outcome?.status === "completed" && r.outcome.actualLiftPct !== undefined && (r.outcome.forecastLiftPct ?? r.expectedLiftPct ?? 0) > 0)
      .map((r) => ({ caseName: c.name, title: r.title, forecast: r.outcome!.forecastLiftPct ?? r.expectedLiftPct!, actual: r.outcome!.actualLiftPct! })),
  );
  if (!done.length) return { completed: 0, ratio: null, hitRate: null, examples: [] };
  const ratios = done.map((d) => Math.max(0, Math.min(3, d.actual / d.forecast)));
  return {
    completed: done.length,
    ratio: Math.round((ratios.reduce((a, b) => a + b, 0) / ratios.length) * 100) / 100,
    hitRate: Math.round((done.filter((d) => d.actual >= d.forecast).length / done.length) * 100) / 100,
    examples: done.slice(-5),
  };
}

const STOP = new Set("the a an and or of to in on for with our we is are was were has have had this that over last months month year years from by at as it its be been their they them".split(" "));
const tokens = (s: string) => new Set(s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)));

export interface Precedent {
  id: string;
  name: string;
  industryId?: string;
  problemTypes: string[];
  similarity: number;
  why: string[];
  validatedHypotheses: string[];
  recommendations: { title: string; priority: string; outcome?: string }[];
}

/** Past cases most like this one (same industry, overlapping problem types and wording). */
export async function similarCases(orgId: string, c: Pick<Case, "id" | "industryId" | "problemTypes" | "problemStatement" | "name">, limit = 3): Promise<Precedent[]> {
  const rows = await cases().query({ where: [["organizationId", "==", orgId]] });
  const mine = tokens(`${c.name} ${c.problemStatement}`);
  return rows
    .filter((o) => o.id !== c.id && (o.hypotheses.length > 0 || o.recommendations.length > 0))
    .map((o) => {
      const why: string[] = [];
      let score = 0;
      if (c.industryId && o.industryId === c.industryId) { score += 3; why.push("same industry"); }
      const shared = o.problemTypes.filter((t) => c.problemTypes.includes(t));
      if (shared.length) { score += 2 * shared.length; why.push(`also a ${shared.join(" / ")} problem`); }
      const theirs = tokens(`${o.name} ${o.problemStatement}`);
      const overlap = [...mine].filter((w) => theirs.has(w));
      const jaccard = overlap.length / Math.max(1, new Set([...mine, ...theirs]).size);
      score += jaccard * 6;
      if (overlap.length >= 2) why.push(`similar wording (${overlap.slice(0, 4).join(", ")})`);
      return {
        id: o.id,
        name: o.name,
        ...(o.industryId ? { industryId: o.industryId } : {}),
        problemTypes: o.problemTypes,
        similarity: Math.round(Math.min(1, score / 9) * 100) / 100,
        why,
        validatedHypotheses: o.hypotheses.filter((h) => h.status === "agreed" || h.status === "partially_agreed").map((h) => h.statement).slice(0, 3),
        recommendations: o.recommendations.slice(0, 3).map((r) => ({
          title: r.title,
          priority: r.priority,
          ...(r.outcome ? { outcome: r.outcome.status === "completed" && r.outcome.actualLiftPct !== undefined ? `delivered ${r.outcome.actualLiftPct}% lift (forecast ${r.outcome.forecastLiftPct ?? r.expectedLiftPct ?? "?"}%)` : r.outcome.status } : {}),
        })),
      };
    })
    .filter((p) => p.similarity >= 0.3)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

/** Compact text for the agents: precedent and calibration, clearly labelled as organisational history. */
export async function memoryForAgents(orgId: string, c: Case): Promise<string | undefined> {
  const [record, similar] = await Promise.all([trackRecord(orgId), similarCases(orgId, c, 2)]);
  const lines: string[] = [];
  if (record.completed) lines.push(`Track record: ${record.completed} completed initiatives delivered on average ${record.ratio}× their forecast lift (${Math.round((record.hitRate ?? 0) * 100)}% met forecast). Calibrate lift assumptions accordingly.`);
  for (const p of similar) {
    lines.push(`Similar past case "${p.name}" (${p.why.join(", ")}): validated ${p.validatedHypotheses.join(" | ") || "no hypotheses yet"}; recommended ${p.recommendations.map((r) => `${r.title}${r.outcome ? ` [${r.outcome}]` : ""}`).join(" | ") || "nothing yet"}.`);
  }
  return lines.length ? lines.join("\n") : undefined;
}
