import "server-only";
import type { BrandProfile, Case } from "@/domain/types";
import { buildReportModel } from "./model";
import { renderMarkdown } from "./markdown";

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
  // XML (DOCX/PPTX) forbids most control characters; AI output occasionally contains them.
  const model = JSON.parse(JSON.stringify(buildReportModel(c, brand)), (_k, v) =>
    typeof v === "string" ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "") : v,
  ) as ReturnType<typeof buildReportModel>;
  const slug = c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "strategy";
  // Renderers load on demand so a problem in one format's library can't
  // break the others, and load failures surface as readable errors.
  let body: Buffer | string;
  try {
    body =
      format === "pdf" ? await (await import("./pdf")).renderPdf(model)
      : format === "docx" ? await (await import("./docx")).renderDocx(model)
      : format === "pptx" ? await (await import("./pptx")).renderPptx(model)
      : format === "md" ? renderMarkdown(model)
      : JSON.stringify(model, null, 2);
  } catch (err) {
    throw new Error(`Could not generate the ${format.toUpperCase()} file: ${err instanceof Error ? err.message : String(err)}`);
  }
  return { body, mime: MIME[format], filename: `${slug}.${format}` };
}
