import "server-only";
import {
  AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel, Packer, PageNumber,
  ImageRun, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, VerticalAlign, WidthType,
} from "docx";
import { fit, logoOf } from "./brandAssets";
import type { Block, ReportModel } from "./model";
import { branchLines, flowStyle } from "./flowStyle";

const hex = (c: string) => c.replace("#", "").toUpperCase();

function cellParas(text: string, opts: { bold?: boolean; color?: string; font: string }) {
  return text.split("\n").map((line) => new Paragraph({ children: [new TextRun({ text: line, bold: opts.bold, color: opts.color, font: opts.font, size: 18 })] }));
}

function renderBlock(b: Block, m: ReportModel): (Paragraph | Table)[] {
  const font = m.brand.fontFamily;
  switch (b.type) {
    case "paragraph":
      return [new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: b.text, font, size: 21 })] })];
    case "bullets":
      return b.items.map((i) => new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: i, font, size: 21 })] }));
    case "callout":
      return [
        new Paragraph({
          shading: { type: ShadingType.CLEAR, fill: "F2F5F9", color: "auto" },
          border: { left: { style: BorderStyle.SINGLE, size: 18, color: hex(m.brand.accentColor), space: 6 } },
          spacing: { before: 120 },
          children: [new TextRun({ text: b.label, bold: true, font, size: 20, color: hex(m.brand.primaryColor) })],
        }),
        ...b.text.split("\n").map((line) => new Paragraph({
          shading: { type: ShadingType.CLEAR, fill: "F2F5F9", color: "auto" },
          border: { left: { style: BorderStyle.SINGLE, size: 18, color: hex(m.brand.accentColor), space: 6 } },
          spacing: { after: 0 },
          children: [new TextRun({ text: line, font, size: 20 })],
        })),
        new Paragraph({ text: "" }),
      ];
    case "table":
      return [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              tableHeader: true,
              children: b.headers.map((h) => new TableCell({
                shading: { type: ShadingType.CLEAR, fill: hex(m.brand.primaryColor), color: "auto" },
                children: cellParas(h, { bold: true, color: "FFFFFF", font }),
              })),
            }),
            ...b.rows.map((r) => new TableRow({ children: r.map((v) => new TableCell({ children: cellParas(v, { font }) })) })),
          ],
        }),
        new Paragraph({ text: "" }),
      ];
    case "flow":
      return [flowTable(b.steps, font), new Paragraph({ text: "" })];
  }
}

const NONE = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NO_BORDERS = { top: NONE, bottom: NONE, left: NONE, right: NONE };

/** Journey flowchart as a grid: three shaded step boxes per row joined by arrows, a down-arrow between rows. */
function flowTable(steps: Extract<Block, { type: "flow" }>["steps"], font: string): Table {
  const PER_ROW = 3;
  const rows: TableRow[] = [];
  const arrowCell = (text: string) => new TableCell({
    borders: NO_BORDERS,
    width: { size: 6, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, color: "94A3B8", size: 28, font })] })],
  });
  const emptyCell = (pct: number) => new TableCell({ borders: NO_BORDERS, width: { size: pct, type: WidthType.PERCENTAGE }, children: [new Paragraph("")] });
  for (let r = 0; r < steps.length; r += PER_ROW) {
    if (r > 0) {
      rows.push(new TableRow({ children: [new TableCell({ borders: NO_BORDERS, columnSpan: PER_ROW * 2 - 1, children: [new Paragraph({ alignment: AlignmentType.LEFT, indent: { left: 900 }, children: [new TextRun({ text: "↓", color: "94A3B8", size: 28, font })] })] })] }));
    }
    const cells: TableCell[] = [];
    for (let k = 0; k < PER_ROW; k++) {
      const st = steps[r + k];
      if (!st) {
        cells.push(emptyCell(29));
        if (k < PER_ROW - 1) cells.push(emptyCell(6));
        continue;
      }
      const style = flowStyle(st.type);
      const border = { style: BorderStyle.SINGLE, size: 8, color: hex(style.stroke) };
      cells.push(new TableCell({
        width: { size: 29, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.CLEAR, fill: hex(style.fill), color: "auto" },
        borders: { top: border, bottom: border, left: border, right: border },
        margins: { top: 80, bottom: 80, left: 100, right: 100 },
        children: [
          new Paragraph({ children: [new TextRun({ text: `${r + k + 1}  ${style.label.toUpperCase()}`, bold: true, color: hex(style.stroke), size: 14, font })] }),
          new Paragraph({ spacing: { before: 40 }, children: [new TextRun({ text: st.label, bold: true, size: 19, font })] }),
          ...branchLines(st).map((line) => new Paragraph({ spacing: { before: 40 }, children: [new TextRun({ text: `• ${line}`, color: "92400E", size: 16, font })] })),
        ],
      }));
      if (k < PER_ROW - 1) cells.push(steps[r + k + 1] ? arrowCell("→") : emptyCell(6));
    }
    rows.push(new TableRow({ children: cells }));
  }
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: { ...NO_BORDERS, insideHorizontal: NONE, insideVertical: NONE }, rows });
}

export async function renderDocx(m: ReportModel): Promise<Buffer> {
  const font = m.brand.fontFamily;
  const headingFont = m.brand.headingFont || font;
  const logo = logoOf(m.brand);
  const logoRun = (maxW: number, maxH: number) =>
    logo ? new ImageRun({ type: "png", data: logo.data, transformation: fit(logo.width, logo.height, maxW, maxH) }) : null;
  const headerLogo = logoRun(90, 24);
  const coverLogo = logoRun(220, 80);
  const doc = new Document({
    creator: m.companyName || "GrowthPilot",
    title: m.title,
    styles: { default: { document: { run: { font } } } },
    sections: [
      {
        properties: {},
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  ...(headerLogo ? [headerLogo, new TextRun({ text: "   " })] : []),
                  new TextRun({ text: `${m.companyName ? `${m.companyName} · ` : ""}${m.title}`, size: 16, color: "7A8699", font }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES], size: 16, color: "7A8699", font })] })],
          }),
        },
        children: [
          ...(coverLogo ? [new Paragraph({ spacing: { before: 1200 }, children: [coverLogo] })] : []),
          new Paragraph({ spacing: { before: coverLogo ? 1200 : 2400 }, children: [new TextRun({ text: m.title, bold: true, size: 56, color: hex(m.brand.primaryColor), font: headingFont })] }),
          ...(m.brand.tagline ? [new Paragraph({ children: [new TextRun({ text: m.brand.tagline, italics: true, size: 22, color: "7A8699", font })] })] : []),
          new Paragraph({ children: [new TextRun({ text: m.subtitle, size: 28, color: hex(m.brand.secondaryColor), font })] }),
          new Paragraph({ spacing: { after: 2400 }, children: [new TextRun({ text: `${m.companyName ? `${m.companyName} · ` : ""}${m.generatedAt.slice(0, 10)}`, size: 22, color: "7A8699", font })] }),
          ...m.sections.flatMap((s) => [
            new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: s.id === "executive" || s.id === "objective", spacing: { before: 360, after: 120 }, children: [new TextRun({ text: s.title, bold: true, color: hex(m.brand.primaryColor), size: 32, font: headingFont })] }),
            ...s.blocks.flatMap((b) => renderBlock(b, m)),
          ]),
        ],
      },
    ],
  });
  return Packer.toBuffer(doc);
}
