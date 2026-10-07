import { Fragment, type ReactNode } from "react";

/**
 * Tiny, dependency-free Markdown renderer for AI answers. It never injects
 * HTML: everything becomes React text nodes. Supports headings, bullet and
 * numbered lists, **bold**, *italic*, `code` and paragraphs. Stray markers
 * (e.g. a lone "***" or "---" rule) are dropped instead of shown raw.
 */
export function Markdown({ text, className }: { text: string; className?: string }) {
  const blocks = parseBlocks(text);
  return (
    <div className={className}>
      {blocks.map((b, i) => {
        if (b.kind === "h") return <p key={i} className="mt-2 font-semibold first:mt-0">{inline(b.text)}</p>;
        if (b.kind === "ul")
          return <ul key={i} className="my-1.5 list-disc space-y-1 pl-5">{b.items.map((t, j) => <li key={j}>{inline(t)}</li>)}</ul>;
        if (b.kind === "ol")
          return <ol key={i} className="my-1.5 list-decimal space-y-1 pl-5">{b.items.map((t, j) => <li key={j}>{inline(t)}</li>)}</ol>;
        if (b.kind === "p") return <p key={i} className="my-1.5 first:mt-0 last:mb-0">{inline(b.text)}</p>;
        return null;
      })}
    </div>
  );
}

type Block = { kind: "h" | "p"; text: string } | { kind: "ul" | "ol"; items: string[] };

export function parseBlocks(text: string): Block[] {
  const out: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) out.push({ kind: "p", text: para.join(" ") });
    para = [];
  };
  for (const raw of text.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line || /^([*_\-=])\1{2,}$/.test(line)) { flush(); continue; }
    const h = line.match(/^#{1,6}\s+(.*)$/);
    const ul = line.match(/^[-*•]\s+(.*)$/);
    const ol = line.match(/^\d+[.)]\s+(.*)$/);
    if (h) { flush(); out.push({ kind: "h", text: h[1]! }); continue; }
    if (ul || ol) {
      flush();
      const kind = ul ? "ul" : "ol";
      const item = (ul ?? ol)![1]!;
      const last = out[out.length - 1];
      if (last && last.kind === kind) last.items.push(item);
      else out.push({ kind, items: [item] });
      continue;
    }
    para.push(line);
  }
  flush();
  return out;
}

/** Inline formatting: `code`, **bold**, *italic* / _italic_. Unmatched markers are removed. */
export function inline(text: string): ReactNode {
  const parts: ReactNode[] = [];
  const re = /(`[^`]+`|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|__[^_]+__|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  const plain = (s: string) => s.replace(/\*{2,}|(^|\s)\*(?=\s|$)/g, "$1");
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(plain(text.slice(last, m.index)));
    const tok = m[0];
    if (tok.startsWith("`")) parts.push(<code key={k++} className="rounded bg-black/5 px-1 font-mono text-[0.9em]">{tok.slice(1, -1)}</code>);
    else if (tok.startsWith("***")) parts.push(<strong key={k++}><em>{tok.slice(3, -3)}</em></strong>);
    else if (tok.startsWith("**") || tok.startsWith("__")) parts.push(<strong key={k++} className="font-semibold">{tok.slice(2, -2)}</strong>);
    else parts.push(<em key={k++}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) parts.push(plain(text.slice(last)));
  return parts.map((p, i) => <Fragment key={i}>{p}</Fragment>);
}
