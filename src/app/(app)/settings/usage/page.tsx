"use client";

import { Card, CardBody, CardHeader, ErrorNote, Spinner } from "@/components/ui";
import { useApi } from "@/lib/client/useApi";

interface Usage {
  days: number; requests: number; failures: number; inputTokens: number; outputTokens: number; costUsd: number; costTracked: boolean; avgLatencyMs: number;
  byModel: { model: string; requests: number; inputTokens: number; outputTokens: number; costUsd: number; failures: number }[];
  byAgent: { agent: string; requests: number }[];
}

export default function UsagePage() {
  const { data, error, loading } = useApi<Usage>("/api/usage?days=30");
  return (
    <div>
      <p className="mb-4 text-sm text-muted">Last 30 days, all members of your organization.</p>
      <ErrorNote error={error} />
      {loading || !data ? <Spinner /> : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-4">
            {[
              ["Requests", data.requests.toLocaleString("en")],
              ["Tokens", (data.inputTokens + data.outputTokens).toLocaleString("en")],
              ["Cost", data.costTracked ? `$${data.costUsd.toFixed(2)}` : "Set prices per provider"],
              ["Avg latency", `${data.avgLatencyMs.toLocaleString("en")} ms`],
            ].map(([k, v]) => <Card key={k} className="p-5"><div className="text-sm text-muted">{k}</div><div className="mt-1 text-2xl font-semibold tabular-nums">{v}</div></Card>)}
          </div>
          <Card>
            <CardHeader title="By model" description={`${data.failures} failed request(s)`} />
            <CardBody>
              <table className="w-full text-sm tabular-nums">
                <thead className="text-left text-xs uppercase tracking-wide text-muted"><tr><th className="pb-2">Model</th><th className="pb-2">Requests</th><th className="pb-2">Input tokens</th><th className="pb-2">Output tokens</th><th className="pb-2">Failures</th><th className="pb-2">Cost</th></tr></thead>
                <tbody className="divide-y divide-line">{data.byModel.map((m) => <tr key={m.model}><td className="py-2">{m.model}</td><td>{m.requests}</td><td>{m.inputTokens.toLocaleString("en")}</td><td>{m.outputTokens.toLocaleString("en")}</td><td>{m.failures}</td><td>{data.costTracked ? `$${m.costUsd.toFixed(3)}` : "—"}</td></tr>)}</tbody>
              </table>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="By agent" />
            <CardBody className="flex flex-wrap gap-4 text-sm">{data.byAgent.map((a) => <div key={a.agent}><span className="text-muted">{a.agent}</span> <span className="font-medium tabular-nums">{a.requests}</span></div>)}</CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
