"use client";

import { aiPreferenceHeaders } from "./aiPreference";
import { firebaseAuth, isDemoMode } from "./firebase";

export class ApiError extends Error {
  constructor(readonly status: number, message: string, readonly code?: string, readonly details?: unknown) {
    super(message);
  }
}

async function authHeader(): Promise<Record<string, string>> {
  if (isDemoMode) return {};
  const user = firebaseAuth().currentUser;
  if (!user) return {};
  return { authorization: `Bearer ${await user.getIdToken()}` };
}

export async function apiFetch<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(path, {
    method: init.method ?? (init.body !== undefined ? "POST" : "GET"),
    headers: { ...(init.body !== undefined ? { "content-type": "application/json" } : {}), ...aiPreferenceHeaders(), ...(await authHeader()) },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    // Not our JSON (e.g. a platform error page): surface what we got.
    if (!res.ok) throw new ApiError(res.status, `Request failed (${res.status}): ${text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200)}`);
    throw new ApiError(res.status, "The server returned an unexpected response.");
  }
  if (!res.ok) {
    const ref = res.headers.get("x-request-id");
    const fallback = `Request failed (${res.status}${text ? "" : ", empty response"}). Check the hosting logs${ref ? ` for request ${ref}` : ""}.`;
    throw new ApiError(res.status, (json.error as string) ?? fallback, json.code as string | undefined, json.details);
  }
  return json as T;
}

/** Authenticated file download (exports never use public URLs). */
export async function apiDownload(path: string): Promise<void> {
  const res = await fetch(path, { headers: await authHeader(), cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message: string | undefined;
    try {
      message = (JSON.parse(text) as { error?: string }).error;
    } catch {
      /* platform error page, not our JSON */
    }
    const ref = res.headers.get("x-request-id") ?? res.headers.get("x-vercel-id");
    throw new ApiError(
      res.status,
      message ??
        `Download failed (${res.status}${text ? `: ${text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160)}` : ""})${ref ? ` · ref ${ref}` : ""}`,
    );
  }
  const blob = await res.blob();
  const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? "download";
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
