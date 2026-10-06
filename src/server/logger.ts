import "server-only";

type Level = "info" | "warn" | "error";

/** Structured JSON logs — picked up by Cloud Logging / Vercel log drains. */
export function log(level: Level, event: string, data: Record<string, unknown> = {}) {
  const line = JSON.stringify({ level, event, time: new Date().toISOString(), ...data });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
