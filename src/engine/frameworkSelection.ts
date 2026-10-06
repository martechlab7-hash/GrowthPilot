import type { ProblemType } from "@/domain/types";
import { FRAMEWORKS, type DiagnosticFramework } from "@/knowledge/frameworks";
import { getIndustry } from "@/knowledge/industries";

export interface FrameworkMatch {
  framework: DiagnosticFramework;
  score: number;
  reasons: string[];
}

/** Select only the diagnostic frameworks relevant to this problem (spec §54). */
export function selectFrameworks(input: {
  problemStatement: string;
  problemTypes: ProblemType[];
  industryId?: string;
  max?: number;
}): FrameworkMatch[] {
  const text = input.problemStatement.toLowerCase();
  const industry = getIndustry(input.industryId);
  const matches = FRAMEWORKS.map((framework) => {
    const reasons: string[] = [];
    let score = 0;
    const typeHits = framework.problemTypes.filter((t) => input.problemTypes.includes(t));
    if (typeHits.length) {
      score += 3 * typeHits.length;
      reasons.push(`Addresses ${typeHits.join(", ")} problems`);
    }
    const kw = framework.keywords.filter((k) => text.includes(k));
    if (kw.length) {
      score += 2 * kw.length;
      reasons.push(`Problem mentions ${kw.map((k) => `"${k}"`).join(", ")}`);
    }
    if (industry?.frameworks.includes(framework.id)) {
      score += 1;
      reasons.push(`Standard diagnostic for ${industry.name}`);
    }
    return { framework, score, reasons };
  })
    .filter((m) => m.score >= 3)
    .sort((a, b) => b.score - a.score);
  return matches.slice(0, input.max ?? 6);
}
