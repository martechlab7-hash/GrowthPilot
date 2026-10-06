import "server-only";
import type { BrandProfile, Case } from "@/domain/types";
import { buildReportModel } from "./model";
import { renderMarkdown } from "./markdown";
import { renderDocx } from "./docx";
import { renderPptx } from "./pptx";
import { renderPdf } from "./pdf";

export const EXPORT_FORMATS = ["pdf", "docx", "pptx", "md", "json"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

const MIME: Record<ExportFormat, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  md: "text/markdown; charset=utf-8",
  json: "application/json",
};

export async function renderReport(c: Case, brand: BrandProfile, format: ExportFormat) {
  const model = buildReportModel(c, brand);
  const slug = c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "strategy";
  const body: Buffer | string =
    format === "pdf" ? await renderPdf(model)
    : format === "docx" ? await renderDocx(model)
    : format === "pptx" ? await renderPptx(model)
    : format === "md" ? renderMarkdown(model)
    : JSON.stringify(model, null, 2);
  return { body, mime: MIME[format], filename: `${slug}.${format}` };
}
