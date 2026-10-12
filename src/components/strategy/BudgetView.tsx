"use client";

import { AlertTriangle, Wallet } from "lucide-react";
import { Badge, Card, CardBody, CardHeader, EmptyState } from "@/components/ui";
import { BUDGET_CATEGORIES, budgetIssues, budgetTotals, monthlyCeiling } from "@/engine/strategy/budget";
import { HORIZON_WEEKS } from "@/engine/strategy/roadmap";
import { money } from "@/reports/model";
import { cn } from "@/lib/cn";
import type { CaseTabProps } from "@/components/case/Workspace";
import { PACE_LABEL, cap } from "./shared";

const CAT_COLOR: Record<(typeof BUDGET_CATEGORIES)[number], string> = { media: "bg-brand-500", technology: "bg-sky-500", agency: "bg-violet-500", creative: "bg-amber-400", internal: "bg-slate-400" };

export function BudgetView({ view, go }: CaseTabProps) {
  const c = view.case;
  const s = c.strategy!;
  if (!s.budget.length) {
    return <EmptyState icon={<Wallet className="h-8 w-8" />} title="No budget scenarios yet" description="They are built with the roadmap from the approved recommendations." action={<button className="text-sm font-medium text-brand-600" onClick={() => go("roadmap")}>Go to roadmap</button>} />;
  }
  const ceiling = monthlyCeiling(c.context);
  const months = Math.max(1, Math.round(HORIZON_WEEKS[s.settings.horizon] / 4.33));
  const totals = s.budget.map((b) => ({ b, t: budgetTotals(b), issues: budgetIssues(b, c.context) }));
  const max = Math.max(1, ...totals.map((x) => x.t.monthly), ceiling ?? 0);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Budget scenarios"
          description={`Totals are calculated in code from each line. ${ceiling ? `Monthly ceiling: ${money(ceiling, c.currency)}.` : "No budget ceiling was given in the interview."} Spend over the ${months}-month horizon includes one-time costs.`}
        />
        <CardBody className="grid gap-4 lg:grid-cols-3">
          {totals.map(({ b, t, issues }) => (
            <div key={b.pace} className={cn("rounded-xl border p-4", b.pace === s.settings.pace ? "border-brand-500 ring-2 ring-brand-500/15" : "border-line")}>
              <div className="flex items-center justify-between"><span className="font-semibold">{PACE_LABEL[b.pace]}</span>{b.pace === s.settings.pace && <Badge tone="violet">Chosen</Badge>}</div>
              <p className="mt-1 text-xs text-muted">{b.summary}</p>
              <div className="mt-3 text-2xl font-semibold tabular-nums tracking-tight">{money(t.monthly, c.currency)}<span className="text-sm font-normal text-muted">/month</span></div>
              <div className="text-xs text-muted">+ {money(t.oneTime, c.currency)} one-time · {money(t.overMonths(months), c.currency)} over {months} months</div>
              <div className="relative mt-3 flex h-3 overflow-hidden rounded-full bg-canvas" aria-label="Monthly spend by category">
                {BUDGET_CATEGORIES.map((k) => t.byCategory[k].monthly > 0 && <div key={k} className={CAT_COLOR[k]} style={{ width: `${(t.byCategory[k].monthly / max) * 100}%` }} title={`${cap(k)}: ${money(t.byCategory[k].monthly, c.currency)}`} />)}
                {ceiling && <div className="absolute top-0 h-3 w-0.5 bg-red-500" style={{ left: `${Math.min(100, (ceiling / max) * 100)}%` }} title="Ceiling" />}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
                {BUDGET_CATEGORIES.filter((k) => t.byCategory[k].monthly || t.byCategory[k].oneTime).map((k) => <span key={k} className="flex items-center gap-1"><span className={cn("h-2 w-2 rounded-full", CAT_COLOR[k])} />{cap(k)} {money(t.byCategory[k].monthly, c.currency)}</span>)}
              </div>
              {b.forecast && (
                <div className="mt-3 rounded-lg bg-canvas px-3 py-2 text-xs">
                  <div className="font-medium">Estimate · {b.forecast.metric}</div>
                  <div className="mt-1 flex justify-between tabular-nums"><span>Low {b.forecast.low.toLocaleString("en")}</span><span className="font-semibold">Base {b.forecast.base.toLocaleString("en")}</span><span>High {b.forecast.high.toLocaleString("en")}</span></div>
                  <div className="mt-1 text-muted">Assumes: {b.forecast.assumptions.join("; ")}. Not a guarantee.</div>
                </div>
              )}
              {b.scalingCriteria.length > 0 && <ul className="mt-3 space-y-1 text-xs">{b.scalingCriteria.map((x) => <li key={x}>Scale only when: {x}</li>)}</ul>}
              {issues.map((i) => <p key={i} className="mt-2 flex gap-1.5 text-xs text-amber-800"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />{i}</p>)}
            </div>
          ))}
        </CardBody>
      </Card>

      {s.budget.map((b) => (
        <Card key={b.pace}>
          <CardHeader title={`${PACE_LABEL[b.pace]} · budget lines`} />
          <CardBody className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted"><tr><th className="pb-2 font-medium">Line</th><th className="pb-2 font-medium">Category</th><th className="pb-2 text-right font-medium">Monthly</th><th className="pb-2 text-right font-medium">One-time</th><th className="pb-2 pl-4 font-medium">Note</th></tr></thead>
              <tbody className="divide-y divide-line">
                {b.lines.map((l) => (
                  <tr key={l.item}><td className="py-2 pr-3 font-medium">{l.item}</td><td className="py-2 pr-3"><span className="flex items-center gap-1.5"><span className={cn("h-2 w-2 rounded-full", CAT_COLOR[l.category])} />{cap(l.category)}</span></td><td className="py-2 text-right tabular-nums">{money(l.monthly, c.currency)}</td><td className="py-2 text-right tabular-nums">{money(l.oneTime, c.currency)}</td><td className="py-2 pl-4 text-muted">{l.note}</td></tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
