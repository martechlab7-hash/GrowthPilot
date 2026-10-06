import type { CaseVersion } from "@/domain/types";
import { formatValue } from "@/engine/context";

export interface VersionDiff {
  from: { version: number; label: string; createdAt: string };
  to: { version: number; label: string; createdAt: string };
  context: { key: string; before: string | null; after: string | null }[];
  hypotheses: { added: string[]; removed: string[]; statusChanged: { statement: string; before: string; after: string }[] };
  recommendations: { added: string[]; removed: string[]; priorityChanged: { title: string; before: string; after: string }[] };
  diagnosisChanged: boolean;
  economicsChanged: boolean;
  reportChanged: boolean;
}

/** Human-readable comparison between two analysis versions (spec §59). */
export function diffVersions(a: CaseVersion, b: CaseVersion): VersionDiff {
  const [from, to] = a.version <= b.version ? [a, b] : [b, a];
  const fa = from.snapshot.context.fields;
  const fb = to.snapshot.context.fields;
  const keys = new Set([...Object.keys(fa), ...Object.keys(fb)]);
  const context = [...keys]
    .map((key) => ({
      key,
      before: fa[key] ? formatValue(fa[key]!.value) : null,
      after: fb[key] ? formatValue(fb[key]!.value) : null,
    }))
    .filter((d) => d.before !== d.after);

  const hFrom = new Map(from.snapshot.hypotheses.map((h) => [h.id, h]));
  const hTo = new Map(to.snapshot.hypotheses.map((h) => [h.id, h]));
  const rFrom = new Map(from.snapshot.recommendations.map((r) => [r.title, r]));
  const rTo = new Map(to.snapshot.recommendations.map((r) => [r.title, r]));

  return {
    from: { version: from.version, label: from.label, createdAt: from.createdAt },
    to: { version: to.version, label: to.label, createdAt: to.createdAt },
    context,
    hypotheses: {
      added: [...hTo.values()].filter((h) => !hFrom.has(h.id)).map((h) => h.statement),
      removed: [...hFrom.values()].filter((h) => !hTo.has(h.id)).map((h) => h.statement),
      statusChanged: [...hTo.values()]
        .filter((h) => hFrom.has(h.id) && hFrom.get(h.id)!.status !== h.status)
        .map((h) => ({ statement: h.statement, before: hFrom.get(h.id)!.status, after: h.status })),
    },
    recommendations: {
      added: [...rTo.keys()].filter((t) => !rFrom.has(t)),
      removed: [...rFrom.keys()].filter((t) => !rTo.has(t)),
      priorityChanged: [...rTo.values()]
        .filter((r) => rFrom.has(r.title) && rFrom.get(r.title)!.priority !== r.priority)
        .map((r) => ({ title: r.title, before: rFrom.get(r.title)!.priority, after: r.priority })),
    },
    diagnosisChanged: JSON.stringify(from.snapshot.diagnosis ?? null) !== JSON.stringify(to.snapshot.diagnosis ?? null),
    economicsChanged: JSON.stringify(from.snapshot.economics?.scenarios ?? null) !== JSON.stringify(to.snapshot.economics?.scenarios ?? null),
    reportChanged: (from.snapshot.report?.generatedAt ?? null) !== (to.snapshot.report?.generatedAt ?? null),
  };
}
