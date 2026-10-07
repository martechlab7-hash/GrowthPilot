import type { CaseStatus, ProblemType } from "@/domain/types";
import { getIndustry } from "@/knowledge/industries";

export const STATUS_LABEL: Record<CaseStatus, string> = {
  draft: "Draft",
  discovery: "Discovery",
  validation: "Hypothesis validation",
  strategy: "Strategy",
  completed: "Completed",
};

export const STATUS_TONE: Record<CaseStatus, "neutral" | "blue" | "amber" | "violet" | "green"> = {
  draft: "neutral",
  discovery: "blue",
  validation: "amber",
  strategy: "violet",
  completed: "green",
};

export const industryName = (id?: string) => getIndustry(id)?.name ?? "Industry not set";

const PROBLEM_LABELS: Partial<Record<ProblemType, string>> = {
  crm: "CRM",
  martech: "MarTech",
  paid_media: "Paid media",
  seo_content: "SEO & content",
  app_growth: "App growth",
  pipeline: "B2B pipeline",
};

export const problemLabel = (p: ProblemType) => PROBLEM_LABELS[p] ?? p.charAt(0).toUpperCase() + p.slice(1);

export function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${Math.round(s)}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}
