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
    case "flow": {
      // Mermaid renders as a flowchart on GitHub, Notion, Obsidian and most Markdown viewers.
      const q = (t: string) => t.replace(/"/g, "'").replace(/[\[\]{}<>]/g, " ");
      const lines = ["```mermaid", "flowchart LR"];
      b.steps.forEach((st, i) => {
        const text = `${i + 1}. ${q(st.label)}`;
        lines.push(st.type === "condition" ? `  s${i}{"${text}"}` : `  s${i}["${text}"]`);
      });
      const idx = (label?: string) => b.steps.findIndex((x) => x.label === label);
      // Branch targets re-join the flow after the last sibling branch, not at each other.
      const rejoin = new Map<number, number>();
      for (const st of b.steps) {
        const targets = (st.branches ?? []).map((br) => idx(br.target)).filter((j) => j >= 0);
        if (targets.length > 1) {
          const after = Math.max(...targets) + 1;
          for (const j of targets) rejoin.set(j, after);
        }
      }
      b.steps.forEach((st, i) => {
        const targets = (st.branches ?? []).map((br) => ({ br, j: idx(br.target) })).filter((x) => x.j >= 0);
        if (targets.length) for (const t of targets) lines.push(`  s${i} -- "${q(t.br.label)}" --> s${t.j}`);
        else {
          const next = rejoin.get(i) ?? i + 1;
          if (next < b.steps.length) lines.push(`  s${i} --> s${next}`);
        }
      });
      lines.push("```");
      return lines.join("\n");
    }
  }
}

export function renderMarkdown(m: ReportModel): string {
  const head = [`# ${m.title}`, `_${m.subtitle}${m.companyName ? ` · ${m.companyName}` : ""} · ${m.generatedAt.slice(0, 10)}_`];
  const body = m.sections.map((s) => [`## ${s.title}`, ...s.blocks.map(block)].join("\n\n"));
  return [...head, ...body].join("\n\n") + "\n";
}
