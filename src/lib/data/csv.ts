/** Small RFC-4180-style parser for CSV / TSV / semicolon-separated exports. */
export interface Table {
  headers: string[];
  rows: string[][];
}

export function detectDelimiter(text: string): string {
  const head = text.split(/\r?\n/).slice(0, 5).join("\n");
  const counts = [",", "\t", ";", "|"].map((d) => [d, head.split(d).length - 1] as const);
  return counts.sort((a, b) => b[1] - a[1])[0]![1] > 0 ? counts[0]![0] : ",";
}

export function parseDelimited(text: string, maxRows = 50_000): Table {
  const delim = detectDelimiter(text);
  const out: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"' && cell === "") quoted = true;
    else if (ch === delim) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((c) => c.trim() !== "")) out.push(row);
      row = [];
      if (out.length > maxRows) break;
    } else cell += ch;
  }
  if (cell !== "" || row.length) { row.push(cell); if (row.some((c) => c.trim() !== "")) out.push(row); }
  const [first = [], ...rest] = out;
  const headers = first.map((h, i) => h.trim() || `column_${i + 1}`);
  return { headers, rows: rest.map((r) => headers.map((_, i) => (r[i] ?? "").trim())) };
}

export function toCsv(t: Table): string {
  const q = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [t.headers, ...t.rows].map((r) => r.map(q).join(",")).join("\n");
}
