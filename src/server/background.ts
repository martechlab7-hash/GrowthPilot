import "server-only";
import { after } from "next/server";
import { log } from "./logger";

/**
 * Run AI work after the response has been sent (Next.js `after`, which keeps
 * the serverless function alive until it finishes), so users never wait on
 * enrichment such as fact extraction or interview tailoring.
 * Tests run the task inline so results are deterministic.
 */
export async function inBackground(name: string, task: () => Promise<unknown>): Promise<void> {
  const safe = async () => {
    try {
      await task();
    } catch (err) {
      log("warn", "background.failed", { task: name, message: (err as Error).message });
    }
  };
  if (process.env.VITEST) return safe();
  try {
    after(safe);
  } catch {
    // Outside a request scope (scripts): run detached.
    void safe();
  }
}
