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

import { deflateSync } from "node:zlib";
import { isValidPng } from "./brandAssets";

/** Build a real 4x2 RGBA PNG. */
function makePng(): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (b: Buffer) => {
    let c = 0xffffffff;
    for (const x of b) c = crcTable[(c ^ x) & 0xff]! ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, body: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(body.length);
    const tb = Buffer.concat([Buffer.from(type, "ascii"), body]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(tb));
    return Buffer.concat([len, tb, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(4, 0);
  ihdr.writeUInt32BE(2, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.concat([0, 1].map(() => Buffer.concat([Buffer.from([0]), Buffer.from(Array(16).fill(200))])));
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
const PNG = `data:image/png;base64,${makePng().toString("base64")}`;

describe("logo validation", () => {
  it("accepts a real PNG and rejects corrupt data instead of crashing renderers", () => {
    expect(isValidPng(makePng())).toBe(true);
    const corrupt = makePng();
    corrupt[corrupt.length - 20] = (corrupt[corrupt.length - 20] ?? 0) ^ 0xff;
    expect(isValidPng(corrupt)).toBe(false);
    expect(isValidPng(Buffer.from("not a png"))).toBe(false);
  });
});
const branded: ReportModel = { ...model, brand: { ...DEFAULT_BRAND, logoDataUrl: PNG, headingFont: "Georgia", tagline: "Strategy that ships" } };

describe("branded exports embed the logo", () => {
  it("PDF", async () => expect((await renderPdf(branded)).subarray(0, 4).toString()).toBe("%PDF"), 30_000);
  it("DOCX contains an image part", async () => expect((await renderDocx(branded)).includes(Buffer.from("word/media/"))).toBe(true), 30_000);
  it("PPTX contains an image part", async () => expect((await renderPptx(branded)).includes(Buffer.from("ppt/media/"))).toBe(true), 30_000);
});

describe("report renderers with hostile content", () => {
  it("renders PDF", async () => expect((await renderPdf(model)).subarray(0, 4).toString()).toBe("%PDF"), 30_000);
  it("renders DOCX", async () => expect((await renderDocx(model)).subarray(0, 2).toString()).toBe("PK"), 30_000);
  it("renders PPTX", async () => expect((await renderPptx(model)).subarray(0, 2).toString()).toBe("PK"), 30_000);
});

describe("report layout", () => {
  const flow: ReportModel = {
    ...model,
    title: "Flow",
    companyName: "Acme",
    sections: [
      {
        id: "activation", title: "11. Activation Strategy", headline: "Activation journeys",
        blocks: [
          { type: "callout", label: "Winback", text: "Objective: retain" },
          { type: "flow", steps: [
            { type: "trigger", label: "No booking in 90 days" },
            { type: "condition", label: "High value?", branches: [{ label: "Yes", target: "Personal offer" }, { label: "No", target: "Reminder email" }] },
            { type: "channel", label: "Personal offer" },
            { type: "channel", label: "Reminder email" },
            { type: "wait", label: "7 days" },
            { type: "measure", label: "Rebooking vs control" },
          ] },
        ],
      },
    ],
  };
  const pageCount = (pdf: Buffer) => (pdf.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length;

  it("adds no blank footer pages to the PDF", async () => {
    // Cover + one content page, and nothing else.
    expect(pageCount(await renderPdf(flow))).toBe(2);
  });

  it("renders journey flowcharts in every format", async () => {
    const { renderMarkdown } = await import("./markdown");
    const md = renderMarkdown(flow);
    expect(md).toContain("```mermaid");
    expect(md).toContain('s1 -- "Yes" --> s2');
    // Both branch targets re-join at the step after them, not at each other.
    expect(md).toContain("s2 --> s4");
    expect(md).not.toContain("s2 --> s3");
    expect((await renderDocx(flow)).length).toBeGreaterThan(1000);
    expect((await renderPptx(flow)).length).toBeGreaterThan(1000);
  });
});
