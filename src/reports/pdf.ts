import "server-only";
import PDFDocument from "pdfkit";
import type { Block, ReportModel } from "./model";
import { fit, logoOf, pdfFonts } from "./brandAssets";
import { branchLines, flowStyle } from "./flowStyle";

const MARGIN = 54;

/** Branded PDF with headers, footers, page numbers and tables (spec §48). */
export async function renderPdf(input: ReportModel): Promise<Buffer> {
  const m = sanitizeModel(input);
  const doc = new PDFDocument({ size: "A4", margins: { top: MARGIN + 10, bottom: MARGIN + 10, left: MARGIN, right: MARGIN }, bufferPages: true, info: { Title: m.title, Author: m.companyName || "GrowthPilot" } });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  const width = doc.page.width - MARGIN * 2;
  const { primaryColor: primary, secondaryColor: secondary, accentColor: accent } = m.brand;
  const fonts = pdfFonts(m.brand);
  const logo = logoOf(input.brand); // from the unsanitised model: data URLs are ASCII anyway

  // Cover
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(primary);
  doc.rect(MARGIN, 330, 70, 4).fill(accent);
  if (logo) {
    const size = fit(logo.width, logo.height, 180, 64);
    doc.roundedRect(MARGIN - 10, 90, size.width + 20, size.height + 16, 8).fill("#FFFFFF");
    doc.image(logo.data, MARGIN, 98, size);
  }
  doc.fillColor("#FFFFFF").font(fonts.heading).fontSize(30).text(m.title, MARGIN, 220, { width });
  if (m.brand.tagline) doc.font(fonts.body).fontSize(12).fillColor("#DCE6F5").text(m.brand.tagline, MARGIN, 300, { width });
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
    doc.font(fonts.heading).fontSize(18).fillColor(primary).text(s.title, MARGIN, doc.y, { width });
    doc.moveDown(0.6);
    for (const b of s.blocks) renderBlock(doc, b, width, { primary, accent, ensure });
  });

  // Headers and footers on every content page.
  const range = doc.bufferedPageRange();
  for (let i = 1; i < range.count; i++) {
    doc.switchToPage(i);
    // Header and footer sit inside the page margins; without this, pdfkit treats
    // text below the bottom margin as overflow and appends a blank page per footer.
    const bottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.font("Helvetica").fontSize(8).fillColor("#7A8699");
    doc.text(`${m.companyName ? `${m.companyName} · ` : ""}${m.title}`, MARGIN, 24, { width, align: "right", lineBreak: false });
    if (logo) doc.image(logo.data, MARGIN, 18, fit(logo.width, logo.height, 70, 16));
    doc.rect(MARGIN, 38, width, 0.6).fill(secondary);
    doc.fillColor("#7A8699").text(`Page ${i} of ${range.count - 1}`, MARGIN, doc.page.height - 36, { width, align: "center", lineBreak: false });
    doc.page.margins.bottom = bottom;
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
    case "flow":
      drawFlow(doc, b.steps, width, t.ensure);
      break;
  }
}

/**
 * Journey flowchart: rows of three colour-coded boxes joined by arrows, with an
 * elbow connector from the end of one row to the start of the next.
 */
function drawFlow(doc: Doc, steps: Extract<Block, { type: "flow" }>["steps"], width: number, ensure: (h: number) => void) {
  const PER_ROW = 3;
  const GAP = 26;
  const boxW = (width - GAP * (PER_ROW - 1)) / PER_ROW;
  const pad = 8;
  const arrowHead = (x: number, y: number, dir: "right" | "down") => {
    if (dir === "right") doc.polygon([x, y], [x - 6, y - 3.5], [x - 6, y + 3.5]).fill("#94A3B8");
    else doc.polygon([x, y], [x - 3.5, y - 6], [x + 3.5, y - 6]).fill("#94A3B8");
  };
  const textH = (st: (typeof steps)[number]) => {
    doc.font("Helvetica-Bold").fontSize(9.5);
    let h = doc.heightOfString(st.label, { width: boxW - pad * 2 });
    doc.font("Helvetica").fontSize(8);
    for (const line of branchLines(st)) h += doc.heightOfString(`- ${line.replace("→", "->")}`, { width: boxW - pad * 2 - 6 }) + 4;
    return h + 12 + pad * 2 + (st.branches?.length ? 4 : 0);
  };
  let prevBottom: { x: number; y: number } | null = null;
  for (let r = 0; r < steps.length; r += PER_ROW) {
    const row = steps.slice(r, r + PER_ROW);
    const rowH = Math.max(...row.map(textH));
    const startedNewPage = (() => {
      const before = doc.y;
      ensure(rowH + 28);
      return doc.y < before;
    })();
    let y: number = doc.y + (prevBottom && !startedNewPage ? 18 : 0);
    if (prevBottom && !startedNewPage) {
      // Elbow connector: down from the previous row's last box, back left, into this row.
      const midY = prevBottom.y + 9;
      doc.lineWidth(1.2).strokeColor("#94A3B8");
      doc.moveTo(prevBottom.x, prevBottom.y).lineTo(prevBottom.x, midY).lineTo(MARGIN + boxW / 2, midY).lineTo(MARGIN + boxW / 2, y - 2).stroke();
      arrowHead(MARGIN + boxW / 2, y, "down");
    } else if (prevBottom) {
      doc.font("Helvetica-Oblique").fontSize(8).fillColor("#64748B").text("(continued)", MARGIN, y, { width });
      y = doc.y + 4;
    }
    row.forEach((st, k) => {
      const x = MARGIN + k * (boxW + GAP);
      const style = flowStyle(st.type);
      doc.roundedRect(x, y, boxW, rowH, 7).fillAndStroke(style.fill, style.stroke);
      doc.lineWidth(1);
      doc.font("Helvetica-Bold").fontSize(7).fillColor(style.stroke).text(`${r + k + 1}  ${style.label.toUpperCase()}`, x + pad, y + pad, { width: boxW - pad * 2, characterSpacing: 0.6 });
      doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#0F172A").text(st.label, x + pad, doc.y + 3, { width: boxW - pad * 2 });
      for (const line of branchLines(st)) {
        doc.font("Helvetica").fontSize(8).fillColor("#92400E").text(`- ${line.replace("→", "->")}`, x + pad + 4, doc.y + 4, { width: boxW - pad * 2 - 6 });
      }
      if (k < row.length - 1) {
        const ay = y + rowH / 2;
        doc.lineWidth(1.2).strokeColor("#94A3B8").moveTo(x + boxW + 3, ay).lineTo(x + boxW + GAP - 3, ay).stroke();
        arrowHead(x + boxW + GAP - 2, ay, "right");
      }
    });
    const lastX = MARGIN + (row.length - 1) * (boxW + GAP) + boxW / 2;
    prevBottom = { x: lastX, y: y + rowH };
    doc.y = y + rowH;
  }
  doc.x = MARGIN;
  doc.moveDown(1.2);
}

/** Standard PDF fonts are WinAnsi-encoded; replace glyphs they cannot render. */
const winAnsi = (s: string) =>
  s.replace(/₹/g, "INR ").replace(/[→⇒]/g, "->").replace(/[^\x00-\xFF€–—‘’“”•…™]/g, "?");

function sanitizeModel(m: ReportModel): ReportModel {
  return JSON.parse(JSON.stringify(m), (_k, v) => (typeof v === "string" ? winAnsi(v) : v)) as ReportModel;
}
