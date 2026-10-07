/** Helpers so the UI greets people by name, never by raw email address. */
export function looksLikeEmail(s: string | undefined): boolean {
  return !!s && /^[^\s@]+@[^\s@]+$/.test(s.trim());
}

/** True when we only have an email (or nothing) and should ask for a name. */
export function needsName(displayName: string | undefined): boolean {
  return !displayName?.trim() || looksLikeEmail(displayName);
}

/** Display name, or a readable fallback derived from an email local part. */
export function friendlyName(displayName: string | undefined): string {
  const n = displayName?.trim() ?? "";
  if (n && !looksLikeEmail(n)) return n;
  const local = n.split("@")[0] ?? "";
  const words = local.replace(/\d+/g, " ").split(/[._\-+\s]+/).filter((w) => w.length > 1);
  return words.length ? words.map((w) => w[0]!.toUpperCase() + w.slice(1).toLowerCase()).join(" ") : "there";
}

export function firstName(displayName: string | undefined): string {
  return friendlyName(displayName).split(/\s+/)[0] ?? "";
}

export function initials(displayName: string | undefined): string {
  const n = friendlyName(displayName);
  return n === "there" ? "?" : n.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}
