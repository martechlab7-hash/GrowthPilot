"use client";

import Link from "next/link";
import { Plus, Radar, Rocket, Wrench } from "lucide-react";
import type { CaseSummary } from "@/domain/types";
import { CaseCollection } from "@/components/CaseCollection";
import { Button, Card, CardBody, ErrorNote, PageHeader, Spinner } from "@/components/ui";
import { OwlSays } from "@/components/mascot";
import { useApi } from "@/lib/client/useApi";

const USES = [
  { icon: Wrench, title: "Improve what you run", text: "Diagnose an existing programme: falling performance, retention, acquisition cost and channel effectiveness." },
  { icon: Rocket, title: "Go to market", text: "Launch a product, service, segment or market with positioning, audience, channel and launch plans." },
  { icon: Radar, title: "Market & competitor intelligence", text: "Optional research into competitors' observable messaging, offers and channels, with or without comparisons." },
];

export default function StrategiesPage() {
  const { data, error, loading } = useApi<{ strategies: CaseSummary[] }>("/api/strategies");
  const list = data?.strategies ?? [];
  return (
    <>
      <PageHeader
        title="Strategy Builder"
        description="An AI strategy consultant that interviews you, diagnoses the business, builds a strategy, lets a devil's-advocate panel attack it, then turns it into a roadmap, budget scenarios and KPIs."
        action={<Link href="/strategies/new"><Button><Plus className="h-4 w-4" /> New strategy</Button></Link>}
      />
      <ErrorNote error={error} />
      {loading ? (
        <Spinner label="Loading…" />
      ) : list.length ? (
        <CaseCollection items={list} />
      ) : (
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-brand-50 via-white to-violet-50 px-6 py-6">
            <OwlSays size={80}>Most AI tools write a generic marketing plan. I&apos;ll ask the right next question, diagnose the real problem, and give you a plan your team can execute.</OwlSays>
          </div>
          <CardBody className="grid gap-4 sm:grid-cols-3">
            {USES.map((u) => (
              <div key={u.title} className="rounded-xl border border-line p-4">
                <u.icon className="h-5 w-5 text-brand-600" />
                <div className="mt-2 font-semibold">{u.title}</div>
                <p className="mt-1 text-sm text-muted">{u.text}</p>
              </div>
            ))}
            <div className="sm:col-span-3"><Link href="/strategies/new"><Button><Plus className="h-4 w-4" /> Build your first strategy</Button></Link></div>
          </CardBody>
        </Card>
      )}
    </>
  );
}
