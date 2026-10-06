import "server-only";
import PDFDocument from "pdfkit";
import type { Block, ReportModel } from "./model";

const MARGIN = 54;

/** Branded PDF with headers, footers, page numbers and tables (spec §48). */
export async function renderPdf(input: ReportModel): Promise<Buffer> {
  const m = sanitizeModel(input);
  const doc = new PDFDocument({ size: "A4", margins: { top: MARGIN + 10, bottom: MARGIN + 10, left: MARGIN, right: MARGIN }, bufferPages: true, info: { Title: m.title, Author: m.companyName || "GrowthPilot" } });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));
  const width = doc.page.width - MARGIN * 2;
  const { primaryColor: primary, secondaryColor: secondary, accentColor: accent } = m.brand;

  // Cover
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(primary);
  doc.rect(MARGIN, 330, 70, 4).fill(accent);
  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(30).text(m.title, MARGIN, 220, { width });
  doc.font("Helvetica").fontSize(14).fillColor("#DCE6F5").text(m.subtitle, MARGIN, 350, { width });
  doc.fontSize(11).text(`${m.companyName ? `${m.companyName} · ` : ""}${m.generatedAt.slice(0, 10)}`, MARGIN, doc.page.height - 120, { width });

  const ensure = (h: number) => {
    if (doc.y + h > doc.page.height - MARGIN - 10) doc.addPage();
  };

  doc.addPage();
  m.sections.forEach((s, i) => {
    // The executive summary stands alone; later sections flow, never orphaning a heading.
    if (i > 0 && (m.sections[i - 1]!.id === "executive" || doc.y > doc.page.height - MARGIN - 160)) doc.addPage();
    else if (i > 0) doc.moveDown(1.2);
    doc.font("Helvetica-Bold").fontSize(18).fillColor(primary).text(s.title, MARGIN, doc.y, { width });
    doc.moveDown(0.6);
    for (const b of s.blocks) renderBlock(doc, b, width, { primary, accent, ensure });
  });

  // Headers and footers on every content page.
  const range = doc.bufferedPageRange();
  for (let i = 1; i < range.count; i++) {
    doc.switchToPage(i);
    doc.font("Helvetica").fontSize(8).fillColor("#7A8699");
    doc.text(`${m.companyName ? `${m.companyName} · ` : ""}${m.title}`, MARGIN, 24, { width, align: "right", lineBreak: false });
    doc.rect(MARGIN, 38, width, 0.6).fill(secondary);
    doc.fillColor("#7A8699").text(`Page ${i} of ${range.count - 1}`, MARGIN, doc.page.height - 36, { width, align: "center", lineBreak: false });
  }
  doc.end();
  return done;
}

type Doc = InstanceType<typeof PDFDocument>;

function renderBlock(doc: Doc, b: Block, width: number, t: { primary: string; accent: string; ensure: (h: number) => void }) {
  switch (b.type) {
    case "paragraph":
      t.ensure(30);
      doc.font("Helvetica").fontSize(10.5).fillColor("#1F2937").text(b.text, MARGIN, doc.y, { width });
      doc.moveDown(0.5);
      break;
    case "bullets":
      for (const item of b.items) {
        t.ensure(20);
        doc.font("Helvetica").fontSize(10.5).fillColor("#1F2937").text(`•  ${item}`, MARGIN + 6, doc.y, { width: width - 6 });
        doc.moveDown(0.2);
      }
      doc.moveDown(0.4);
      break;
    case "callout": {
      const text = `${b.text}`;
      doc.font("Helvetica").fontSize(10);
      const h = doc.heightOfString(text, { width: width - 20 }) + 28;
      t.ensure(h);
      const y = doc.y;
      doc.rect(MARGIN, y, width, h).fill("#F2F5F9");
      doc.rect(MARGIN, y, 3, h).fill(t.accent);
      doc.font("Helvetica-Bold").fontSize(10).fillColor(t.primary).text(b.label, MARGIN + 12, y + 8, { width: width - 20 });
      doc.font("Helvetica").fontSize(10).fillColor("#1F2937").text(text, MARGIN + 12, doc.y + 2, { width: width - 20 });
      doc.y = y + h + 8;
      break;
    }
    case "table": {
      const cols = b.headers.length;
      const colW = width / cols;
      const drawRow = (cells: string[], header: boolean) => {
        doc.font(header ? "Helvetica-Bold" : "Helvetica").fontSize(8.5);
        const h = Math.max(...cells.map((c) => doc.heightOfString(c || " ", { width: colW - 8 }))) + 8;
        t.ensure(h);
        const y = doc.y;
        if (header) doc.rect(MARGIN, y, width, h).fill(t.primary);
        cells.forEach((c, i) => {
          doc.fillColor(header ? "#FFFFFF" : "#1F2937").text(c || " ", MARGIN + i * colW + 4, y + 4, { width: colW - 8 });
        });
        doc.moveTo(MARGIN, y + h).lineTo(MARGIN + width, y + h).lineWidth(0.4).strokeColor("#D5DCE6").stroke();
        doc.y = y + h;
      };
      drawRow(b.headers, true);
      for (const r of b.rows) drawRow(r, false);
      doc.moveDown(0.8);
      break;
    }
  }
}

/** Standard PDF fonts are WinAnsi-encoded; replace glyphs they cannot render. */
const winAnsi = (s: string) =>
  s.replace(/₹/g, "INR ").replace(/[→⇒]/g, "->").replace(/[^\x00-\xFF€–—‘’“”•…™]/g, "?");

function sanitizeModel(m: ReportModel): ReportModel {
  return JSON.parse(JSON.stringify(m), (_k, v) => (typeof v === "string" ? winAnsi(v) : v)) as ReportModel;
}
