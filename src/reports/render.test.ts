import { describe, expect, it } from "vitest";
import { DEFAULT_BRAND } from "@/domain/types";
import { renderDocx } from "./docx";
import { renderPdf } from "./pdf";
import { renderPptx } from "./pptx";
import type { ReportModel } from "./model";

const nasty = "Open rate ↓15% — ₹4,000 AOV 🚀 “quotes” <tag> & ampersand \u0007bell \u0000nul ​zero-width ✓ 中文 العربية";
const long = "Lorem ipsum dolor sit amet. ".repeat(250);

const model: ReportModel = {
  title: `Stress ${nasty}`,
  subtitle: "Airlines · Marketing Strategy & Diagnostic",
  companyName: "Acme & Co 🚀",
  generatedAt: new Date().toISOString(),
  brand: DEFAULT_BRAND,
  sections: [
    { id: "executive", title: "Executive Summary", headline: nasty, blocks: [{ type: "callout", label: nasty, text: long }, { type: "bullets", items: Array.from({ length: 40 }, (_, i) => `${i} ${nasty}`) }] },
    { id: "diagnosis", title: "4. Diagnosis", headline: long, blocks: [{ type: "paragraph", text: long }, { type: "table", headers: ["A", "B", "C", "D", "E"], rows: Array.from({ length: 120 }, (_, i) => [String(i), nasty, long.slice(0, 900), "x\ny\nz", ""]) }] },
    { id: "empty", title: "Empty", headline: "", blocks: [{ type: "table", headers: ["Only"], rows: [] }, { type: "bullets", items: [] }] },
  ],
};

describe("report renderers with hostile content", () => {
  it("renders PDF", async () => expect((await renderPdf(model)).subarray(0, 4).toString()).toBe("%PDF"), 30_000);
  it("renders DOCX", async () => expect((await renderDocx(model)).subarray(0, 2).toString()).toBe("PK"), 30_000);
  it("renders PPTX", async () => expect((await renderPptx(model)).subarray(0, 2).toString()).toBe("PK"), 30_000);
});
