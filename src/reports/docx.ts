import "server-only";
import {
  AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel, Packer, PageNumber,
  ImageRun, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType,
} from "docx";
import { fit, logoOf } from "./brandAssets";
import type { Block, ReportModel } from "./model";

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
  }
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
