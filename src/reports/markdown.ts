import type { Block, ReportModel } from "./model";

const esc = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, "<br>");

function block(b: Block): string {
  switch (b.type) {
    case "paragraph":
      return b.text;
    case "bullets":
      return b.items.map((i) => `- ${i}`).join("\n");
    case "callout":
      return `> **${b.label}**\n>\n${b.text.split("\n").map((l) => `> ${l}`).join("\n")}`;
    case "table":
      return [
        `| ${b.headers.map(esc).join(" | ")} |`,
        `| ${b.headers.map(() => "---").join(" | ")} |`,
        ...b.rows.map((r) => `| ${r.map(esc).join(" | ")} |`),
      ].join("\n");
  }
}

export function renderMarkdown(m: ReportModel): string {
  const head = [`# ${m.title}`, `_${m.subtitle}${m.companyName ? ` · ${m.companyName}` : ""} · ${m.generatedAt.slice(0, 10)}_`];
  const body = m.sections.map((s) => [`## ${s.title}`, ...s.blocks.map(block)].join("\n\n"));
  return [...head, ...body].join("\n\n") + "\n";
}
