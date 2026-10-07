import type { Assessment, Case, Debate, EvidenceItem, Hypothesis } from "@/domain/types";

/**
 * Evidence verifier (deterministic, no AI). Every evidence item an agent
 * produces is checked against the case:
 *  - a source key must exist in the case context, a shared dataset, or a
 *    computed analysis;
 *  - "fact" is only allowed when a cited source is itself a confirmed fact or
 *    the client's shared data; otherwise it is downgraded.
 */
type VerifyCase = Pick<Case, "context"> & Partial<Pick<Case, "datasets">>;

export function isKnownSource(c: VerifyCase, key: string): "fact" | "inference" | "data" | null {
  if (key.startsWith("shared_data:") || key.startsWith("analysis:")) {
    const name = key.split(":").slice(1).join(":").trim().toLowerCase();
    return (c.datasets ?? []).some((d) => name.startsWith(d.name.toLowerCase())) ? "data" : null;
  }
  const f = c.context.fields[key];
  if (!f) return null;
  return f.kind === "fact" ? "fact" : "inference";
}

export function verifyEvidence(c: VerifyCase, items: EvidenceItem[]): { items: EvidenceItem[]; verifiedFacts: number; downgraded: number; unsupported: number; dataBacked: boolean } {
  let verifiedFacts = 0;
  let downgraded = 0;
  let unsupported = 0;
  let dataBacked = false;
  const out = items.map((e) => {
    const sources = e.sourceKeys.map((k) => isKnownSource(c, k));
    const valid = e.sourceKeys.filter((_, i) => sources[i] !== null);
    if (sources.includes("data")) dataBacked = true;
    if (e.kind === "fact") {
      if (sources.some((s) => s === "fact" || s === "data")) {
        verifiedFacts++;
        return { ...e, sourceKeys: valid };
      }
      downgraded++;
      return { ...e, kind: valid.length ? ("inference" as const) : ("assumption" as const), sourceKeys: valid };
    }
    if (e.kind === "inference" && !valid.length) unsupported++;
    return { ...e, sourceKeys: valid };
  });
  return { items: out, verifiedFacts, downgraded, unsupported, dataBacked };
}

const VERDICT_FACTOR: Record<Debate["verdict"]["outcome"], number> = { survives: 1, weakened: 0.55, refuted: 0.15 };

/**
 * Confidence computed by rules, not by the model:
 *   score = 45% model confidence + 35% evidence strength + 20% debate verdict
 * (without a debate the model confidence carries that weight).
 */
export function assessHypothesis(c: VerifyCase, h: Pick<Hypothesis, "evidence" | "confidence" | "debate" | "assessment">): Assessment {
  const v = verifyEvidence(c, h.evidence);
  // Downgrades found when the hypothesis was first checked still count after it is re-scored.
  const downgraded = Math.max(v.downgraded, h.assessment?.downgraded ?? 0);
  const total = Math.max(1, h.evidence.length);
  const inferences = v.items.filter((e) => e.kind === "inference" && e.sourceKeys.length).length;
  let strength = (v.verifiedFacts + inferences * 0.5) / total;
  if (v.dataBacked) strength = Math.min(1, strength + 0.15);
  if (!h.evidence.length) strength = 0;
  const debate = h.debate ? VERDICT_FACTOR[h.debate.verdict.outcome] * (0.5 + h.debate.verdict.confidence / 2) : h.confidence;
  const score = Math.max(0, Math.min(1, 0.45 * h.confidence + 0.35 * strength + 0.2 * debate));
  const basis = [
    `${v.verifiedFacts} of ${h.evidence.length} evidence items are verified facts`,
    ...(downgraded ? [`${downgraded} claim${downgraded > 1 ? "s" : ""} labelled as fact had no confirmed source and ${downgraded > 1 ? "were" : "was"} downgraded`] : []),
    ...(v.unsupported ? [`${v.unsupported} inference${v.unsupported > 1 ? "s" : ""} cite no source in the case`] : []),
    ...(v.dataBacked ? ["Backed by data you shared"] : []),
    h.debate ? `Debate verdict: ${h.debate.verdict.outcome}` : "Not yet stress-tested by the debate panel",
  ];
  return {
    evidenceStrength: Math.round(strength * 100) / 100,
    verifiedFacts: v.verifiedFacts,
    downgraded,
    unsupported: v.unsupported,
    dataBacked: v.dataBacked,
    score: Math.round(score * 100) / 100,
    basis,
  };
}

/** Verify a hypothesis' evidence labels in place and attach its rule-based assessment. */
export function withAssessment<T extends Hypothesis>(c: VerifyCase, h: T): T {
  return { ...h, assessment: assessHypothesis(c, h), evidence: verifyEvidence(c, h.evidence).items };
}
