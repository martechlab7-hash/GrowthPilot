"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ArrowRight, Check, Clock, ShieldCheck, Sparkles } from "lucide-react";
import { Button, Card, CardBody, ErrorNote, Input, Label } from "@/components/ui";
import { OwlSays } from "@/components/mascot";
import { ProviderWizard, type OwlMessage } from "@/components/settings/ProviderWizard";
import { KeyGuideButton } from "@/components/settings/KeyGuide";
import { apiFetch } from "@/lib/client/api";
import { useAuth } from "@/lib/client/auth";
import { cn } from "@/lib/cn";
import { firstName, looksLikeEmail } from "@/lib/name";

type Step = "workspace" | "ai";

export default function OnboardingPage() {
  return (
    <Suspense>
      <Onboarding />
    </Suspense>
  );
}

function Onboarding() {
  const auth = useAuth();
  const router = useRouter();
  // The step lives in the URL so a reload on step 2 stays there.
  const step: Step = useSearchParams().get("step") === "ai" ? "ai" : "workspace";
  const [org, setOrg] = useState("");
  const [name, setName] = useState("");
  const suggested = auth.user && !looksLikeEmail(auth.user.name) ? auth.user.name : "";
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [owl, setOwl] = useState<OwlMessage | null>(null);

  useEffect(() => {
    if (auth.loading) return;
    if (!auth.user) router.replace("/login");
    else if (auth.me?.onboarded && step === "workspace") router.replace("/dashboard");
  }, [auth, router, step]);

  const canManage = !auth.me?.onboarded || ["owner", "admin"].includes(auth.me.profile.role);
  const finish = async () => {
    await auth.refreshMe().catch(() => {});
    router.replace("/dashboard");
  };
  const named = auth.me?.onboarded ? firstName(auth.me.profile.displayName) : firstName((name || suggested).trim());
  const who = named === "there" ? "" : named;

  return (
    <main className="flex min-h-screen items-start justify-center bg-gradient-to-br from-brand-50 via-canvas to-violet-50 px-4 py-10 sm:items-center">
      <div className={cn("w-full space-y-4", step === "ai" ? "max-w-3xl" : "max-w-md")}>
        <Steps step={step} />

        {step === "workspace" ? (
          <Card className="shadow-pop">
            <CardBody className="space-y-4 p-8">
              <OwlSays size={72}>Welcome! Let&apos;s set up your workspace.</OwlSays>
              <h1 className="text-xl font-semibold tracking-tight">Tell us about you</h1>
              <p className="text-sm text-muted">Cases, brand settings and AI providers belong to your organization. You can invite colleagues later.</p>
              <form
                className="space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  setError(null);
                  try {
                    await apiFetch("/api/me", { body: { organizationName: org, displayName: (name || suggested).trim() || undefined } });
                    // The profile is refreshed when leaving onboarding, so step 2 is never skipped.
                    router.replace("/onboarding?step=ai");
                  } catch (err) {
                    setError((err as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <div>
                  <Label htmlFor="name">Your name</Label>
                  <Input id="name" required={!suggested} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder={suggested || "e.g. Naman Sharma"} />
                </div>
                <div>
                  <Label htmlFor="org">Organization name</Label>
                  <Input id="org" required minLength={2} value={org} onChange={(e) => setOrg(e.target.value)} placeholder="e.g. Acme Consulting" />
                </div>
                <ErrorNote error={error} />
                <Button type="submit" className="w-full" loading={busy}>Continue <ArrowRight className="h-4 w-4" /></Button>
              </form>
            </CardBody>
          </Card>
        ) : (
          <>
            <Card className="overflow-hidden shadow-pop">
              <div className="flex flex-wrap items-start justify-between gap-4 bg-gradient-to-br from-brand-50 via-white to-violet-50 px-6 py-5">
                <OwlSays size={80} mood={owl?.mood ?? null} tone={owl?.tone ?? "default"}>
                  {owl?.text ?? `${who ? `Nice to meet you, ${who}! ` : ""}One last thing: connect an AI provider so I can run diagnoses and write strategies. It takes about two minutes.`}
                </OwlSays>
                <Button variant="ghost" onClick={() => void finish()}><Clock className="h-4 w-4" /> Skip, do it later</Button>
              </div>
              <CardBody className="grid gap-3 border-t border-line text-sm sm:grid-cols-3">
                <Point icon={Sparkles} title="Your own AI account">GrowthPilot uses your key, so you control the model and the spend.</Point>
                <Point icon={ShieldCheck} title="Encrypted">Keys are encrypted and never shown again. Customer personal data is masked before it is sent.</Point>
                <Point icon={Clock} title="Optional for now">You can explore and start cases without it; add a provider later in Settings → AI providers.</Point>
              </CardBody>
            </Card>

            {canManage ? (
              <ProviderWizard onOwl={setOwl} cancelLabel="Skip, do it later" onDone={() => void finish()} />
            ) : (
              <Card>
                <CardBody className="space-y-3 text-sm">
                  <p>Only workspace owners and admins can add AI providers. Ask an admin to connect one in Settings → AI providers.</p>
                  <div className="flex flex-wrap gap-2"><KeyGuideButton kind="openrouter" /><Button onClick={() => void finish()}>Go to dashboard</Button></div>
                </CardBody>
              </Card>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function Steps({ step }: { step: Step }) {
  const items: [Step, string][] = [["workspace", "Your workspace"], ["ai", "Connect AI"]];
  const at = items.findIndex(([s]) => s === step);
  return (
    <ol className="flex items-center justify-center gap-2 text-xs font-medium" aria-label="Setup progress">
      {items.map(([s, label], i) => (
        <li key={s} className="flex items-center gap-2">
          {i > 0 && <span className={cn("h-px w-8", i <= at ? "bg-brand-500" : "bg-line-strong")} />}
          <span className={cn("flex h-6 w-6 items-center justify-center rounded-full", i < at ? "bg-emerald-500 text-white" : i === at ? "bg-brand-600 text-white" : "bg-white text-muted ring-1 ring-line")}>
            {i < at ? <Check className="h-3.5 w-3.5" /> : i + 1}
          </span>
          <span className={i === at ? "text-ink" : "text-muted"} aria-current={i === at ? "step" : undefined}>{label}</span>
        </li>
      ))}
    </ol>
  );
}

function Point({ icon: Icon, title, children }: { icon: typeof Clock; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
      <div><div className="font-medium">{title}</div><p className="text-muted">{children}</p></div>
    </div>
  );
}
