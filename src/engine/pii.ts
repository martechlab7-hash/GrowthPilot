/**
 * PII detection and tokenisation (spec §61). Text is masked before it leaves
 * the platform for an external LLM and restored in the response.
 */
const PATTERNS: { type: string; re: RegExp }[] = [
  { type: "EMAIL", re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
  { type: "CARD", re: /\b(?:\d[ -]?){13,19}\b/g },
  { type: "IBAN", re: /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/g },
  { type: "PAN", re: /\b[A-Z]{5}\d{4}[A-Z]\b/g },
  { type: "AADHAAR", re: /\b\d{4}\s\d{4}\s\d{4}\b/g },
  { type: "PHONE", re: /(?<![\w.])\+?\d[\d\s().-]{8,18}\d(?!\w|\.\d)/g },
  { type: "IP", re: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g },
];

export interface PiiVault {
  tokens: Map<string, string>;
  reverse: Map<string, string>;
  counters: Record<string, number>;
}

export function createVault(): PiiVault {
  return { tokens: new Map(), reverse: new Map(), counters: {} };
}

export function maskPii(text: string, vault: PiiVault = createVault()): { text: string; vault: PiiVault } {
  let out = text;
  for (const { type, re } of PATTERNS) {
    out = out.replace(re, (match) => {
      // Digit runs shorter than 10 are business numbers, not phone numbers.
      const digits = match.replace(/\D/g, "").length;
      if (type === "PHONE" && (digits < 10 || digits > 15)) return match;
      if (type === "CARD" && !luhn(match.replace(/\D/g, ""))) return match;
      const existing = vault.reverse.get(match);
      if (existing) return existing;
      vault.counters[type] = (vault.counters[type] ?? 0) + 1;
      const token = `[${type}_${vault.counters[type]}]`;
      vault.tokens.set(token, match);
      vault.reverse.set(match, token);
      return token;
    });
  }
  return { text: out, vault };
}

export function restorePii(text: string, vault: PiiVault): string {
  let out = text;
  for (const [token, original] of vault.tokens) out = out.split(token).join(original);
  return out;
}

export function containsPii(text: string): boolean {
  return maskPii(text).vault.tokens.size > 0;
}

function luhn(digits: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return digits.length >= 13 && sum % 10 === 0;
}
