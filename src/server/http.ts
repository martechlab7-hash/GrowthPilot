import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { AIUnavailableError } from "@/ai/types";
import { serverConfigProblems } from "./env";
import { log } from "./logger";
import { rateLimit } from "./rateLimit";
import { requireUser, type AuthContext } from "./auth";
import { can, type Permission } from "./permissions";
import { HttpError, badRequest, forbidden } from "./errors";

export { HttpError, badRequest, forbidden, notFound } from "./errors";

export function errorResponse(err: unknown, route: string) {
  if (err instanceof HttpError) {
    log(err.status >= 500 ? "error" : "info", "api.rejected", { route, status: err.status, code: err.code, message: err.message });
    return NextResponse.json({ error: err.message, code: err.code, details: err.details }, { status: err.status });
  }
  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        error: `Invalid request: ${err.issues.slice(0, 3).map((i) => `${i.path.join(".") || "body"} — ${i.message}`).join("; ")}`,
        code: "VALIDATION", details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
      { status: 400 },
    );
  }
  if (err instanceof AIUnavailableError) {
    log("warn", "ai.unavailable", { route, attempts: err.attempts });
    return NextResponse.json({ error: err.message, code: "AI_UNAVAILABLE", details: err.attempts }, { status: 503 });
  }
  log("error", "api.unhandled", { route, message: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : undefined });
  const detail = err instanceof Error ? err.message.slice(0, 300) : undefined;
  return NextResponse.json({ error: `Something went wrong on the server${detail ? `: ${detail}` : ""}. Your work has been saved.`, code: "INTERNAL" }, { status: 500 });
}

type RouteCtx<P> = { params: Promise<P> };

interface ApiOptions {
  permission?: Permission;
  /** Requests per minute per user. */
  rpm?: number;
  /** Allow authenticated users without an organization (bootstrap). */
  allowUnonboarded?: boolean;
}

/** Route wrapper: authentication, RBAC, rate limiting, error mapping, timing. */
export function api<P = Record<string, string>>(
  opts: ApiOptions,
  handler: (req: NextRequest, auth: AuthContext, params: P) => Promise<Response | unknown>,
) {
  return async (req: NextRequest, ctx: RouteCtx<P>) => {
    const route = `${req.method} ${req.nextUrl.pathname}`;
    const started = Date.now();
    const requestId = crypto.randomUUID().slice(0, 8);
    const withId = (res: Response) => {
      res.headers.set("x-request-id", requestId);
      return res;
    };
    try {
      const missing = serverConfigProblems();
      if (missing.length) {
        throw new HttpError(503, `Server is not configured. Missing environment variables: ${missing.join(", ")}`, "SERVER_NOT_CONFIGURED");
      }
      const auth = await requireUser(req, { allowUnonboarded: opts.allowUnonboarded });
      if (!rateLimit(`u:${auth.uid}:${opts.rpm ?? 120}`, opts.rpm ?? 120, opts.rpm ?? 120)) {
        throw new HttpError(429, "Too many requests. Please slow down.", "RATE_LIMITED");
      }
      if (opts.permission && (!auth.profile || !can(auth.profile.role, opts.permission))) throw forbidden();
      const params = (await ctx.params) ?? ({} as P);
      const result = await handler(req, auth, params);
      log("info", "api.request", { route, status: 200, ms: Date.now() - started, uid: auth.uid });
      return withId(result instanceof Response ? result : NextResponse.json(result ?? { ok: true }));
    } catch (err) {
      try {
        return withId(errorResponse(err, `${route} [${requestId}]`));
      } catch {
        return withId(NextResponse.json({ error: "Unexpected server error.", code: "INTERNAL" }, { status: 500 }));
      }
    }
  };
}

export async function readJson<T>(req: NextRequest): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw badRequest("Request body must be valid JSON");
  }
}
