import "server-only";
import PptxGenJS from "pptxgenjs";
import type { Block, ReportModel, ReportSection } from "./model";
import { fit, logoOf } from "./brandAssets";
import { branchLines, flowStyle } from "./flowStyle";

const hex = (c: string) => c.replace("#", "").toUpperCase();
const MAX_ROWS = 6;
const MAX_BULLETS = 7;
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Slide order follows the consulting storyline (spec §46). */
const DECK_ORDER = [
  "executive", "objective", "problem", "findings", "diagnosis", "customer", "data", "technology",
  "hypotheses", "recommendations", "journey", "activation", "measurement", "experiments", "economics", "roadmap", "risks", "next",
];

export async function renderPptx(m: ReportModel): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in
  pptx.title = m.title;
  const font = m.brand.fontFamily;
  const headingFont = m.brand.headingFont || font;
  const logo = logoOf(m.brand);
  const logoData = logo ? `image/png;base64,${logo.base64}` : null;
  const primary = hex(m.brand.primaryColor);
  const secondary = hex(m.brand.secondaryColor);
  const accent = hex(m.brand.accentColor);

  pptx.defineSlideMaster({
    title: "CONTENT",
    background: { color: "FFFFFF" },
    objects: [
      { rect: { x: 0, y: 0, w: 13.33, h: 0.12, fill: { color: primary } } },
      { text: { text: m.companyName || m.title, options: { x: 0.5, y: 7.05, w: 8, h: 0.3, fontSize: 9, color: "7A8699", fontFace: font } } },
      ...(logo && logoData ? [{ image: { data: logoData, x: 13.33 - 0.5 - box(fit(logo.width, logo.height, 1.3, 0.4)).w, y: 0.25, ...box(fit(logo.width, logo.height, 1.3, 0.4)) } }] : []),
    ],
    slideNumber: { x: 12.4, y: 7.05, fontSize: 9, color: "7A8699", fontFace: font },
  });

  // Cover
  const cover = pptx.addSlide();
  cover.background = { color: primary };
  cover.addShape("rect", { x: 0.6, y: 3.05, w: 1.2, h: 0.08, fill: { color: accent } });
  if (logo && logoData) {
    // White card behind the logo so dark logos stay visible on the brand colour.
    const size = box(fit(logo.width, logo.height, 2.6, 0.9));
    cover.addShape("roundRect", { x: 0.5, y: 0.45, w: size.w + 0.3, h: size.h + 0.24, fill: { color: "FFFFFF" }, rectRadius: 0.08 });
    cover.addImage({ data: logoData, x: 0.65, y: 0.57, ...size });
  }
  cover.addText(m.title, { x: 0.6, y: 1.6, w: 12, h: 1.3, fontSize: 40, bold: true, color: "FFFFFF", fontFace: headingFont });
  if (m.brand.tagline) cover.addText(m.brand.tagline, { x: 0.6, y: 3.9, w: 12, h: 0.5, fontSize: 14, italic: true, color: "DCE6F5", fontFace: font });
  cover.addText(m.subtitle, { x: 0.6, y: 3.3, w: 12, h: 0.6, fontSize: 18, color: "DCE6F5", fontFace: font });
  cover.addText(`${m.companyName ? `${m.companyName} · ` : ""}${m.generatedAt.slice(0, 10)}`, { x: 0.6, y: 6.3, w: 12, h: 0.4, fontSize: 12, color: "DCE6F5", fontFace: font });

  const ordered = DECK_ORDER.map((id) => m.sections.find((s) => s.id === id)).filter((s): s is ReportSection => !!s);
  for (const s of ordered) {
    for (const page of paginate(s)) {
      const slide = pptx.addSlide({ masterName: "CONTENT" });
      slide.addText(s.title.replace(/^\d+\.\s*/, "").toUpperCase(), { x: 0.5, y: 0.3, w: 12, h: 0.3, fontSize: 10, bold: true, color: secondary, fontFace: font, charSpacing: 1 });
      slide.addText(clip(s.headline, 140), { x: 0.5, y: 0.6, w: 11, h: 0.9, fontSize: 22, bold: true, color: primary, fontFace: headingFont, valign: "top" });
      let y = 1.6;
      for (const b of page) {
        y = drawBlock(slide, b, y, { font, primary, accent });
        if (y > 6.9) break;
      }
    }
  }
  const out = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
  return out;
}

/** pptxgenjs sizes use w/h (inches). */
function box(s: { width: number; height: number }) {
  return { w: s.width, h: s.height };
}

function paginate(s: ReportSection): Block[][] {
  const pages: Block[][] = [];
  let current: Block[] = [];
  let weight = 0;
  const push = () => {
    if (current.length) pages.push(current);
    current = [];
    weight = 0;
  };
  for (const b of s.blocks) {
    if (b.type === "table") {
      for (let i = 0; i < b.rows.length; i += MAX_ROWS) {
        if (weight > 0) push();
        current.push({ ...b, rows: b.rows.slice(i, i + MAX_ROWS) });
        push();
      }
      continue;
    }
    const w = b.type === "bullets" ? Math.min(b.items.length, MAX_BULLETS) : b.type === "callout" ? 2 : b.type === "flow" ? 6 : 1;
    if (weight + w > 8) push();
    current.push(b.type === "bullets" ? { ...b, items: b.items.slice(0, MAX_BULLETS) } : b);
    weight += w;
  }
  push();
  return pages.length ? pages : [[]];
}

type Slide = ReturnType<PptxGenJS["addSlide"]>;

function drawBlock(slide: Slide, b: Block, y: number, t: { font: string; primary: string; accent: string }): number {
  switch (b.type) {
    case "paragraph":
      slide.addText(clip(b.text, 600), { x: 0.5, y, w: 12.3, h: 0.6, fontSize: 14, color: "1F2937", fontFace: t.font, valign: "top", fit: "shrink" });
      return y + 0.65;
    case "bullets": {
      const h = Math.min(4.8, 0.42 * b.items.length + 0.1);
      slide.addText(
        b.items.map((i) => ({ text: clip(i, 220), options: { bullet: true, breakLine: true } })),
        { x: 0.5, y, w: 12.3, h, fontSize: 14, color: "1F2937", fontFace: t.font, valign: "top", paraSpaceAfter: 6, fit: "shrink" },
      );
      return y + h + 0.1;
    }
    case "callout": {
      const h = Math.min(2.2, 0.35 + 0.3 * b.text.split("\n").length);
      slide.addShape("rect", { x: 0.5, y, w: 0.08, h, fill: { color: t.accent } });
      slide.addText(
        [
          { text: b.label, options: { bold: true, color: t.primary, breakLine: true } },
          { text: clip(b.text, 700), options: { color: "1F2937" } },
        ],
        { x: 0.7, y, w: 12.1, h, fontSize: 13, fontFace: t.font, valign: "top", fill: { color: "F2F5F9" }, fit: "shrink" },
      );
      return y + h + 0.15;
    }
    case "table": {
      const rows = [
        b.headers.map((h) => ({ text: h, options: { bold: true, color: "FFFFFF", fill: { color: t.primary } } })),
        ...b.rows.map((r) => r.map((v) => ({ text: clip(v, 260), options: {} }))),
      ];
      const h = Math.min(5.3, 0.4 + 0.75 * b.rows.length);
      slide.addTable(rows, { x: 0.5, y, w: 12.3, fontSize: 11, fontFace: t.font, color: "1F2937", border: { type: "solid", color: "D5DCE6", pt: 0.5 }, valign: "top", autoPage: false });
      return y + h + 0.2;
    }
    case "flow":
      return drawFlow(slide, b.steps, y, t.font);
  }
}

/** Journey flowchart: rows of colour-coded rounded boxes joined by arrows, elbow connectors between rows. */
function drawFlow(slide: Slide, steps: Extract<Block, { type: "flow" }>["steps"], top: number, font: string): number {
  const perRow = steps.length > 12 ? 5 : 4;
  const gap = 0.42;
  const x0 = 0.5;
  const boxW = (12.3 - gap * (perRow - 1)) / perRow;
  const rows = Math.ceil(steps.length / perRow);
  const avail = 6.85 - top;
  const rowGap = 0.4;
  const boxH = Math.max(0.6, Math.min(1.25, (avail - rowGap * (rows - 1)) / rows));
  const arrow = { color: "94A3B8", width: 1.5 };
  steps.forEach((st, i) => {
    const r = Math.floor(i / perRow);
    const k = i % perRow;
    const x = x0 + k * (boxW + gap);
    const y = top + r * (boxH + rowGap);
    const style = flowStyle(st.type);
    slide.addText(
      [
        { text: `${i + 1}  ${style.label.toUpperCase()}`, options: { bold: true, color: hex(style.stroke), fontSize: 8, breakLine: true, charSpacing: 1 } },
        { text: clip(st.label, 110), options: { bold: true, color: "0F172A", fontSize: 11, breakLine: !!st.branches?.length } },
        ...branchLines(st).map((line, j, all) => ({ text: `• ${clip(line, 60)}`, options: { color: "92400E", fontSize: 8.5, breakLine: j < all.length - 1 } })),
      ],
      {
        shape: "roundRect", rectRadius: 0.08, x, y, w: boxW, h: boxH, fontFace: font, valign: "top", margin: 6, fit: "shrink",
        fill: { color: hex(style.fill) }, line: { color: hex(style.stroke), width: 1.25, ...(st.type === "condition" ? { dashType: "dash" as const } : {}) },
      },
    );
    const last = i === steps.length - 1;
    if (!last && k < perRow - 1) {
      slide.addShape("line", { x: x + boxW + 0.04, y: y + boxH / 2, w: gap - 0.08, h: 0, line: { ...arrow, endArrowType: "triangle" } });
    } else if (!last) {
      // Elbow: down from this box, left across, down into the first box of the next row.
      const midY = y + boxH + rowGap / 2;
      const firstX = x0 + boxW / 2;
      slide.addShape("line", { x: x + boxW / 2, y: y + boxH, w: 0, h: rowGap / 2, line: arrow });
      slide.addShape("line", { x: firstX, y: midY, w: x + boxW / 2 - firstX, h: 0, line: arrow });
      slide.addShape("line", { x: firstX, y: midY, w: 0, h: rowGap / 2, line: { ...arrow, endArrowType: "triangle" } });
    }
  });
  return top + rows * (boxH + rowGap);
}
