import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { INDUSTRIES } from "@/knowledge/industries";
import { VENDOR_GROUPS } from "@/knowledge/martech";
import { FRAMEWORKS } from "@/knowledge/frameworks";
import { MATURITY_LEVELS } from "@/engine/maturity";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui";
import { ResourceLinks } from "@/components/knowledge/ResourceLinks";

export default function KnowledgePage() {
  const industries = INDUSTRIES.filter((i) => i.id !== "other");
  const vendorCount = VENDOR_GROUPS.reduce((n, g) => n + g.vendors.length, 0);
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Knowledge"
        description="What the strategist knows: your team's reference links, industry intelligence, the MarTech catalogue and the maturity model. Qualitative by design — no unsourced benchmarks."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat value={industries.length} label="Industry playbooks" />
        <Stat value={FRAMEWORKS.length} label="Diagnostic frameworks" />
        <Stat value={vendorCount} label="MarTech tools mapped to capabilities" />
      </div>

      <ResourceLinks />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-subtle">Industry intelligence</h2>
        {industries.map((i) => (
          <details key={i.id} className="group rounded-2xl border border-line bg-white shadow-card">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <div className="font-semibold tracking-tight">{i.name}</div>
                <p className="mt-0.5 text-sm text-muted">{i.economicModel}</p>
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 text-subtle transition group-open:rotate-180" />
            </summary>
            <div className="grid gap-4 border-t border-line px-5 py-4 text-sm md:grid-cols-2">
              <Item title="Customer lifecycle">{i.lifecycle.join(" → ")}</Item>
              <Item title="Business models">{i.businessModels.join(", ")}</Item>
              <Item title="KPIs">{i.kpis.join(", ")}</Item>
              <Item title="Common problems">{i.commonProblems.join(", ")}</Item>
              <Item title="Drivers">{i.drivers.join(", ")}</Item>
              <Item title="Typical MarTech stack">{i.martechStack.join(", ")}</Item>
              <Item title="Activation channels">{i.channels.join(", ")}</Item>
              <Item title="Benchmarking guidance">{i.benchmarkGuidance}</Item>
            </div>
          </details>
        ))}
      </section>

      <Card>
        <CardHeader title="MarTech catalogue" description="Tools the interview recognises. Selecting them lets the maturity assessment infer the capabilities you already own." />
        <CardBody className="grid gap-4 text-sm md:grid-cols-2">
          {VENDOR_GROUPS.map((g) => (
            <Item key={g.label} title={g.label}>{g.vendors.map((v) => v.name).join(", ")}</Item>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="MarTech maturity model" />
        <CardBody className="grid gap-3 sm:grid-cols-3">
          {MATURITY_LEVELS.map((l) => <div key={l.level} className="text-sm"><span className="font-semibold">Level {l.level} — {l.name}.</span> <span className="text-muted">{l.description}</span></div>)}
        </CardBody>
      </Card>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white px-5 py-4 shadow-card">
      <div className="text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
      <div className="text-sm text-muted">{label}</div>
    </div>
  );
}

function Item({ title, children }: { title: string; children: ReactNode }) {
  return <div><div className="font-medium">{title}</div><p className="text-muted">{children}</p></div>;
}
