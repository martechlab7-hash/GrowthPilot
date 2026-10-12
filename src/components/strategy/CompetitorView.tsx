"use client";

import { useState } from "react";
import { ExternalLink, Plus, Radar, Trash2 } from "lucide-react";
import { Badge, Button, Card, CardBody, CardHeader, Input, Textarea } from "@/components/ui";
import type { CaseTabProps } from "@/components/case/Workspace";

/** Optional competitor intelligence: public pages only, findings labelled by basis. */
export function CompetitorView({ view, ctl, canManage, go }: CaseTabProps) {
  const s = view.case.strategy!;
  const [list, setList] = useState(s.settings.competitors.length ? s.settings.competitors : [{ name: "", url: "" }]);
  const [questions, setQuestions] = useState(s.settings.researchQuestions ?? "");
  const r = s.research;
  const names = [...new Set((r?.comparisons ?? []).flatMap((x) => x.them.map((t) => t.competitor)))];

  if (s.settings.competitor === "none") {
    return (
      <Card>
        <CardBody className="space-y-3 text-sm">
          <p>Competitor research is switched off for this strategy. Turn it on in the overview settings to research competitors&apos; observable messaging, offers and channels, with or without direct comparisons.</p>
          <Button size="sm" variant="outline" onClick={() => go("overview")}>Open settings</Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Competitors to research"
          description={`${s.settings.competitor === "compare" ? "Research and side-by-side comparison." : "Observable activity only, no direct comparisons."} I read each website's public page; private spend, results or customer data are never estimated.`}
        />
        <CardBody className="space-y-3">
          {list.map((c, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]">
              <Input value={c.name} disabled={!canManage} onChange={(e) => setList(list.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} placeholder="Competitor" aria-label={`Competitor ${i + 1}`} />
              <Input value={c.url ?? ""} disabled={!canManage} onChange={(e) => setList(list.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} placeholder="Website, e.g. rival.com" aria-label={`Competitor ${i + 1} website`} />
              <button type="button" disabled={!canManage} onClick={() => setList(list.filter((_, j) => j !== i))} className="rounded-lg p-2 text-subtle hover:bg-canvas hover:text-red-600" aria-label={`Remove competitor ${i + 1}`}><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          {canManage && list.length < 6 && <button type="button" onClick={() => setList([...list, { name: "", url: "" }])} className="flex items-center gap-1 text-sm font-medium text-brand-600"><Plus className="h-4 w-4" /> Add competitor</button>}
          <Textarea rows={2} value={questions} disabled={!canManage} onChange={(e) => setQuestions(e.target.value)} placeholder="What should the research answer? e.g. How do rivals price trials? Which message do they lead with?" aria-label="Research questions" />
          {canManage && (
            <Button loading={ctl.busy === "Researching"} disabled={!list.some((c) => c.name.trim())} onClick={() => ctl.run("Researching", "/strategy/research", { body: { competitors: list.filter((c) => c.name.trim()).map((c) => ({ name: c.name.trim(), ...(c.url?.trim() ? { url: c.url.trim() } : {}) })), researchQuestions: questions } })}>
              <Radar className="h-4 w-4" /> {r ? "Research again" : "Run the research"}
            </Button>
          )}
        </CardBody>
      </Card>

      {r && (
        <>
          <Card>
            <CardHeader title="Findings" description={`Researched ${new Date(r.at).toLocaleString()}. Observed: read from a public page. Hypothesis: to verify.`} />
            <CardBody className="space-y-3">
              <div className="flex flex-wrap gap-2 text-xs">
                {r.pagesRead.map((p) => (
                  <a key={p.url} href={p.url} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-1 rounded-full border border-line px-2.5 py-1 hover:border-line-strong">
                    {p.competitor}: {p.status === "read" ? (p.title ?? "page read") : "couldn't read"} <ExternalLink className="h-3 w-3" />
                  </a>
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-muted"><tr><th className="pb-2 font-medium">Competitor</th><th className="pb-2 font-medium">Area</th><th className="pb-2 font-medium">Finding</th><th className="pb-2 font-medium">Basis</th></tr></thead>
                  <tbody className="divide-y divide-line">
                    {r.findings.map((f, i) => (
                      <tr key={i}><td className="py-2 pr-3 font-medium">{f.competitor}</td><td className="py-2 pr-3 text-muted">{f.category}</td><td className="py-2 pr-3">{f.finding}</td><td className="py-2"><Badge tone={f.kind === "observed" ? "green" : f.kind === "sourced" ? "blue" : "neutral"}>{f.kind === "hypothesis" ? "Hypothesis" : f.kind === "observed" ? "Observed" : "Sourced"}</Badge></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
          {r.comparisons.length > 0 && (
            <Card>
              <CardHeader title="Side-by-side comparison" />
              <CardBody className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-muted"><tr><th className="pb-2 font-medium">Dimension</th><th className="pb-2 font-medium">Us</th>{names.map((n) => <th key={n} className="pb-2 font-medium">{n}</th>)}</tr></thead>
                  <tbody className="divide-y divide-line">
                    {r.comparisons.map((x) => <tr key={x.dimension}><td className="py-2 pr-3 font-medium">{x.dimension}</td><td className="py-2 pr-3">{x.us}</td>{names.map((n) => <td key={n} className="py-2 pr-3 text-muted">{x.them.find((t) => t.competitor === n)?.note ?? ""}</td>)}</tr>)}
                  </tbody>
                </table>
              </CardBody>
            </Card>
          )}
          {r.implications.length > 0 && (
            <Card>
              <CardHeader title="What it means for the strategy" description="Rebuild the strategy to fold these in." />
              <CardBody><ul className="list-disc space-y-1 pl-5 text-sm">{r.implications.map((x) => <li key={x}>{x}</li>)}</ul></CardBody>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
