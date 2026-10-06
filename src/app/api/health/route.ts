import { NextResponse } from "next/server";
import { env, serverConfigProblems } from "@/server/env";

export const dynamic = "force-dynamic";

export function GET() {
  const missing = serverConfigProblems();
  return NextResponse.json(
    { status: missing.length ? "misconfigured" : "ok", demoMode: env.demoMode, missingEnv: missing, time: new Date().toISOString() },
    { status: missing.length ? 503 : 200 },
  );
}
