import { toCsv, type Table } from "./csv";

export interface ColumnProfile {
  name: string;
  type: "number" | "date" | "text";
  filled: number;
  distinct: number;
  min?: number | string;
  max?: number | string;
  mean?: number;
  sum?: number;
  top?: { value: string; count: number }[];
}

export interface TableProfile {
  rowCount: number;
  columns: ColumnProfile[];
  sample: string;
}

const num = (v: string) => {
  const s = v.replace(/[,\s₹$€£%]/g, "");
  return s !== "" && /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
};
const isDate = (v: string) => /^\d{4}-\d{2}(-\d{2})?|^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(v) && !Number.isNaN(Date.parse(v.replace(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/, "$3-$2-$1")));
const round = (n: number) => Math.round(n * 100) / 100;

/** Compact statistical profile: what the AI needs to reason about a dataset without the raw rows. */
export function profileTable(t: Table, sampleRows = 12): TableProfile {
  const columns = t.headers.map((name, i): ColumnProfile => {
    const values = t.rows.map((r) => r[i] ?? "").filter((v) => v !== "");
    const distinct = new Set(values).size;
    const nums = values.map(num).filter((n) => !Number.isNaN(n));
    if (values.length && nums.length / values.length > 0.9) {
      const sum = nums.reduce((a, b) => a + b, 0);
      return { name, type: "number", filled: values.length, distinct, min: Math.min(...nums), max: Math.max(...nums), mean: round(sum / nums.length), sum: round(sum) };
    }
    if (values.length && values.filter(isDate).length / values.length > 0.9) {
      const sorted = [...values].sort();
      return { name, type: "date", filled: values.length, distinct, min: sorted[0], max: sorted.at(-1) };
    }
    const counts = new Map<string, number>();
    for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([value, count]) => ({ value: value.slice(0, 60), count }));
    return { name, type: "text", filled: values.length, distinct, top };
  });
  return { rowCount: t.rows.length, columns, sample: toCsv({ headers: t.headers, rows: t.rows.slice(0, sampleRows) }).slice(0, 4000) };
}
