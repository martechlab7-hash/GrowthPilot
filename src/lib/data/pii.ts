/**
 * Personal-data guard for shared datasets. Runs in the browser before upload
 * (so raw PII never leaves the user's machine) and again on the server.
 */
import type { Table } from "./csv";

const HEADER_PII = /(^|[^a-z])(e-?mail|phone|mobile|msisdn|whats ?app|first.?name|last.?name|full.?name|surname|customer.?name|^name$|address|street|postcode|zip|dob|birth|ssn|social.?security|passport|aadhaa?r|pan.?(no|number|card)?$|national.?id|tax.?id|card.?(no|number)|iban|account.?(no|number)|ip.?address|device.?id|lat(itude)?$|lon(gitude)?$)/i;
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE = /(?:\+?\d[\s-]?){9,14}\d/;
const CARD = /\b(?:\d[ -]?){13,19}\b/;

export interface PiiColumn {
  index: number;
  name: string;
  reason: string;
}

/** Columns that look like personal data, by header name or by the values they hold. */
export function detectPiiColumns(t: Table): PiiColumn[] {
  const sample = t.rows.slice(0, 200);
  const found: PiiColumn[] = [];
  t.headers.forEach((name, index) => {
    const values = sample.map((r) => r[index] ?? "").filter(Boolean);
    const share = (re: RegExp) => (values.length ? values.filter((v) => re.test(v)).length / values.length : 0);
    if (share(EMAIL) > 0.2) found.push({ index, name, reason: "contains email addresses" });
    else if (HEADER_PII.test(name.trim())) found.push({ index, name, reason: "column name suggests personal data" });
    else if (share(PHONE) > 0.5 && values.every((v) => !/[.]\d/.test(v))) found.push({ index, name, reason: "contains phone numbers" });
    else if (share(CARD) > 0.5 && values.every((v) => v.replace(/\D/g, "").length >= 13)) found.push({ index, name, reason: "contains card or account numbers" });
  });
  return found;
}

/** Stable pseudonym so masked IDs can still be counted and joined. */
export function pseudonym(value: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 0x01000193);
  return `ID-${(h >>> 0).toString(36).padStart(7, "0")}`;
}

export function maskColumns(t: Table, mask: number[], remove: number[]): Table {
  const drop = new Set(remove);
  const hide = new Set(mask);
  const keep = t.headers.map((_, i) => i).filter((i) => !drop.has(i));
  return {
    headers: keep.map((i) => t.headers[i]!),
    rows: t.rows.map((r) => keep.map((i) => (hide.has(i) && r[i] ? pseudonym(r[i]!) : (r[i] ?? "")))),
  };
}

/** Replace emails, phone and card numbers in free text. Returns the text and how many items were masked. */
export function maskFreeText(text: string): { text: string; masked: number } {
  let masked = 0;
  const out = text
    .replace(new RegExp(EMAIL.source, "gi"), () => (masked++, "[email removed]"))
    .replace(/(?:\+?\d[\s-]?){9,14}\d/g, (m) => (/^\d{4}$/.test(m) ? m : (masked++, "[number removed]")));
  return { text: out, masked };
}
