import { FRAMEWORKS } from "@/knowledge/frameworks";
import { Badge, Card, CardBody, PageHeader } from "@/components/ui";

const STAGES = [
  ["B", "Business Objective", "What business outcome are we trying to achieve?"],
  ["D", "Diagnosis", "What is actually happening?"],
  ["C", "Customer", "Who is valuable, who is declining, and why?"],
  ["D", "Data / Insights", "What data exists, how good is it, what is missing?"],
  ["T", "Technology", "Which capabilities exist and which gaps block the use cases?"],
  ["A", "Activation", "Which journeys and channels change behaviour?"],
  ["M", "Measurement", "How will we prove incremental impact?"],
  ["E", "Economics", "What is it worth — revenue vs profit?"],
];

export default function FrameworksPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader title="Frameworks" description="The strategic backbone and diagnostic library the AI consultant selects from." />
      <section>
        <h2 className="mb-3 font-semibold">B-D-C-D-T-A-M-E</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          {STAGES.map(([l, t, d]) => (
            <Card key={t} className="p-4"><div className="text-2xl font-semibold text-brand-600">{l}</div><div className="font-medium">{t}</div><div className="mt-1 text-sm text-muted">{d}</div></Card>
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-3 font-semibold">Diagnostic framework library</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {FRAMEWORKS.map((f) => (
            <Card key={f.id}>
              <CardBody className="space-y-2 text-sm">
                <div className="flex items-center justify-between"><span className="font-semibold">{f.name}</span><Badge>{f.category}</Badge></div>
                <p className="text-muted">{f.description}</p>
                <p><span className="font-medium">Answers: </span>{f.answers}</p>
                <p><span className="font-medium">Needs: </span>{f.requiredData.join(", ")}</p>
                <ol className="list-decimal pl-5 text-muted">{f.steps.map((s) => <li key={s}>{s}</li>)}</ol>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
