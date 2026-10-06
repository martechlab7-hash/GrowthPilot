import { INDUSTRIES } from "@/knowledge/industries";
import { MATURITY_LEVELS } from "@/engine/maturity";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui";

export default function KnowledgePage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="Knowledge" description="Industry intelligence used to tailor interviews, frameworks and recommendations. Qualitative by design — no unsourced benchmarks." />
      <Card>
        <CardHeader title="MarTech maturity model" />
        <CardBody className="grid gap-3 sm:grid-cols-3">
          {MATURITY_LEVELS.map((l) => <div key={l.level} className="text-sm"><span className="font-semibold">Level {l.level} — {l.name}.</span> <span className="text-muted">{l.description}</span></div>)}
        </CardBody>
      </Card>
      {INDUSTRIES.filter((i) => i.id !== "other").map((i) => (
        <Card key={i.id}>
          <CardHeader title={i.name} description={i.economicModel} />
          <CardBody className="grid gap-4 text-sm md:grid-cols-2">
            <div><div className="font-medium">Customer lifecycle</div><p className="text-muted">{i.lifecycle.join(" → ")}</p></div>
            <div><div className="font-medium">Business models</div><p className="text-muted">{i.businessModels.join(", ")}</p></div>
            <div><div className="font-medium">KPIs</div><p className="text-muted">{i.kpis.join(", ")}</p></div>
            <div><div className="font-medium">Common problems</div><p className="text-muted">{i.commonProblems.join(", ")}</p></div>
            <div><div className="font-medium">Drivers</div><p className="text-muted">{i.drivers.join(", ")}</p></div>
            <div><div className="font-medium">Typical MarTech stack</div><p className="text-muted">{i.martechStack.join(", ")}</p></div>
            <div><div className="font-medium">Activation channels</div><p className="text-muted">{i.channels.join(", ")}</p></div>
            <div><div className="font-medium">Benchmarking guidance</div><p className="text-muted">{i.benchmarkGuidance}</p></div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
