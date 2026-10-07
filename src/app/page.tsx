"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Bot,
  CheckCircle2,
  Compass,
  FileText,
  Layers,
  Lightbulb,
  LineChart,
  MessagesSquare,
  Presentation,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Target,
  Wallet,
} from "lucide-react";
import { product } from "@/config/product";
import { useAuth } from "@/lib/client/auth";
import { Owl } from "@/components/mascot";
import { FRAMEWORKS } from "@/knowledge/frameworks";
import { INDUSTRIES } from "@/knowledge/industries";
import { VENDOR_OPTIONS } from "@/knowledge/martech";
import { QUESTION_BANK } from "@/knowledge/questionBank";

const STACK = ["Adobe", "Salesforce", "Braze", "MoEngage", "CleverTap", "HubSpot", "Klaviyo", "Segment", "GA4", "Snowflake"];

const STEPS = [
  { icon: MessagesSquare, title: "Describe the problem", text: "“Repeat bookings fell 12% this year.” Plain language is enough — Pilot extracts the facts." },
  { icon: Sparkles, title: "Answer the right questions", text: "Questions are ranked by information value, including which tools you already run." },
  { icon: Stethoscope, title: "Validate the diagnosis", text: "Root-cause hypotheses with evidence labelled fact, inference or assumption. You agree, challenge or edit." },
  { icon: Target, title: "Get the strategy", text: "Prioritised plays, journeys, KPIs, experiments and economics — exported with your brand." },
];

const FEATURES = [
  { icon: Layers, title: `${FRAMEWORKS.length} diagnostic frameworks`, text: "Funnels, cohorts, RFM, churn, MMM, ABM, pricing elasticity, SEO and more — each with a full guide." },
  { icon: ShieldCheck, title: "Human-in-the-loop", text: "No strategy is built until you approve the hypotheses. Every decision is logged and versioned." },
  { icon: Wallet, title: "Economics you can defend", text: "Deterministic scenarios for revenue, profit, ROI and payback, with every input's provenance shown." },
  { icon: Bot, title: "Bring your own AI", text: "OpenAI, Anthropic, Gemini, OpenRouter or any compatible endpoint. Keys encrypted at rest." },
  { icon: BookOpen, title: "Your knowledge, built in", text: `${INDUSTRIES.length - 1} industry playbooks plus your team's own playbooks and research links.` },
  { icon: MessagesSquare, title: "Ask the case anything", text: "Once the report is ready, chat with Pilot about the case — answers cite the sections they come from." },
];

const FLOW = [
  ["B", "Business"], ["D", "Diagnosis"], ["C", "Customer"], ["D", "Data"],
  ["T", "Technology"], ["A", "Activation"], ["M", "Measurement"], ["E", "Economics"],
];

export default function Landing() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-white text-ink">
      <Nav />

      {/* Hero — full-bleed */}
      <section className="relative isolate overflow-hidden bg-[#0b1030] text-white">
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(60rem_40rem_at_15%_-10%,rgba(99,102,241,0.55),transparent_60%),radial-gradient(50rem_35rem_at_100%_20%,rgba(168,85,247,0.35),transparent_60%),radial-gradient(40rem_30rem_at_50%_120%,rgba(14,165,233,0.25),transparent_60%)]" />
        <div aria-hidden className="absolute inset-0 -z-10 opacity-[0.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-24 pt-16 lg:grid-cols-[1.05fr_1fr] lg:pb-32 lg:pt-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-indigo-100 ring-1 ring-white/15">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" /> {product.tagline}
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              The AI marketing strategist that{" "}
              <span className="bg-gradient-to-r from-indigo-200 via-fuchsia-200 to-amber-200 bg-clip-text text-transparent">investigates before it recommends.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-indigo-100/80">
              Describe a business problem. {product.name} runs a consulting-grade diagnostic, asks the questions with the highest information value,
              separates facts from assumptions, and builds a strategy only after you validate its hypotheses.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/login" className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-indigo-950 shadow-[0_8px_30px_rgba(99,102,241,0.45)] transition hover:bg-indigo-50">
                Start a free case <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#how" className="inline-flex h-12 items-center gap-2 rounded-xl px-5 text-sm font-medium text-white ring-1 ring-white/25 transition hover:bg-white/10">
                See how it works
              </a>
            </div>
            <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-sm text-indigo-100/75">
              {["Bring your own AI key", "PDF · Word · PowerPoint", "Facts vs assumptions, always labelled"].map((t) => (
                <li key={t} className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-300" />{t}</li>
              ))}
            </ul>
          </div>
          <ProductMock />
        </div>
      </section>

      {/* Stack strip */}
      <section className="border-b border-line bg-canvas">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-subtle">Recommends around the stack you already own</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {STACK.map((s) => <span key={s} className="text-lg font-semibold tracking-tight text-slate-400">{s}</span>)}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat value={FRAMEWORKS.length} label="Diagnostic frameworks" />
          <Stat value={INDUSTRIES.length - 1} label="Industry playbooks" />
          <Stat value={QUESTION_BANK.length} label="Expert interview questions" />
          <Stat value={VENDOR_OPTIONS.length} label="MarTech tools understood" />
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-20 bg-canvas py-24">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHead eyebrow="How it works" title="A consulting engagement, in an afternoon" text="The same discipline a senior strategist brings: understand first, hypothesise, validate with you, then recommend." />
          <ol className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative rounded-2xl border border-line bg-white p-6 shadow-card">
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><s.icon className="h-5 w-5" /></span>
                  <span className="text-4xl font-semibold tabular-nums text-slate-100">0{i + 1}</span>
                </div>
                <h3 className="mt-5 font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Framework band */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHead eyebrow="The backbone" title="Every case follows B-D-C-D-T-A-M-E" text="Eight lenses, in order, so nothing important is skipped and every recommendation traces back to evidence." />
          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {FLOW.map(([l, t], i) => (
              <div key={t} className="group rounded-2xl border border-line bg-white p-4 text-center shadow-card transition hover:-translate-y-0.5 hover:border-brand-500/40 hover:shadow-pop">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 text-lg font-semibold text-white shadow-lg shadow-brand-600/25">{l}</div>
                <div className="mt-3 text-sm font-medium">{t}</div>
                <div className="text-[11px] text-subtle">Step {i + 1}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 bg-canvas py-24">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHead eyebrow="Product" title="Built for decisions, not decks" text="Depth where it matters, guardrails everywhere else." />
          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-line bg-white p-6 shadow-card">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><f.icon className="h-5 w-5" /></span>
                <h3 className="mt-5 font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Outputs */}
      <section id="outputs" className="scroll-mt-20 py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-2">
          <div>
            <SectionHead align="left" eyebrow="Outputs" title="Board-ready, in your brand" text="One report model rendered everywhere it needs to go — with your logo, fonts and colours." />
            <ul className="mt-8 space-y-3 text-sm">
              {["Executive summary, diagnosis and validated hypotheses", "Prioritised recommendations with impact × confidence × effort", "Activation journeys, KPI tree, experiments and roadmap", "Economics scenarios with assumptions called out"].map((t) => (
                <li key={t} className="flex gap-2.5"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />{t}</li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <OutputCard icon={FileText} title="PDF report" tone="from-rose-500 to-orange-400" />
            <OutputCard icon={Presentation} title="PowerPoint deck" tone="from-orange-500 to-amber-400" />
            <OutputCard icon={FileText} title="Word document" tone="from-sky-500 to-indigo-500" />
            <OutputCard icon={LineChart} title="Live web report" tone="from-violet-500 to-fuchsia-500" />
          </div>
        </div>
      </section>

      {/* Final CTA — full-bleed */}
      <section className="relative isolate overflow-hidden bg-gradient-to-br from-brand-700 via-brand to-violet-700 text-white">
        <div aria-hidden className="absolute -right-24 -top-24 -z-10 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-8 px-6 py-20 text-center md:flex-row md:text-left">
          <Owl size={120} />
          <div className="flex-1">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Tell Pilot what&apos;s going wrong.</h2>
            <p className="mt-3 max-w-xl text-white/80">Your first case takes minutes. Bring your own AI key — your data stays in your workspace.</p>
          </div>
          <Link href="/login" className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-brand-700 shadow-pop transition hover:bg-brand-50">
            Start a case <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="bg-[#0b1030] text-slate-400">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm sm:flex-row">
          <div className="flex items-center gap-2 font-semibold text-white"><Compass className="h-4 w-4 text-indigo-300" />{product.name}</div>
          <p>{product.description}</p>
          <Link href="/login" className="hover:text-white">Sign in</Link>
        </div>
      </footer>
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b1030]/85 text-white backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-6">
        <Link href="/" className="flex items-center gap-2.5 font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-violet-500 shadow-lg shadow-brand-600/30"><Compass className="h-4.5 w-4.5" /></span>
          {product.name}
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-indigo-100/75 md:flex">
          <a href="#how" className="hover:text-white">How it works</a>
          <a href="#features" className="hover:text-white">Product</a>
          <a href="#outputs" className="hover:text-white">Outputs</a>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/login" className="hidden h-9 items-center rounded-lg px-3 text-sm font-medium text-indigo-100 hover:text-white sm:flex">Sign in</Link>
          <Link href="/login" className="flex h-9 items-center gap-1.5 rounded-lg bg-white px-4 text-sm font-semibold text-indigo-950 transition hover:bg-indigo-50">
            Get started <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

/** A stylised, static preview of the case workspace (pure HTML, no screenshot). */
function ProductMock() {
  return (
    <div className="relative">
      <div aria-hidden className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-tr from-indigo-500/30 to-fuchsia-500/20 blur-2xl" />
      <div className="overflow-hidden rounded-2xl bg-white text-ink shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] ring-1 ring-white/20">
        <div className="flex items-center gap-1.5 border-b border-line bg-canvas px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-300" /><span className="h-2.5 w-2.5 rounded-full bg-amber-300" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          <span className="ml-3 truncate text-xs text-subtle">Improve customer retention · Airline</span>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-[1fr_170px]">
          <div className="space-y-3">
            <div className="rounded-xl border border-brand-600/20 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">Which marketing tools do you use today?</p>
                <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Critical</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {["Salesforce Marketing Cloud", "Braze", "Adobe Analytics", "Segment", "Snowflake"].map((t, i) => (
                  <span key={t} className={i < 3 ? "rounded-full bg-brand-600 px-2.5 py-1 text-[11px] font-medium text-white" : "rounded-full border border-line px-2.5 py-1 text-[11px] text-muted"}>{t}</span>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-line p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted"><Lightbulb className="h-3.5 w-3.5 text-brand-600" /> Hypothesis 1 · confidence 0.72</div>
              <p className="mt-1.5 text-sm">Repeat bookings fell mainly among mid-value leisure travellers after loyalty benefits were reduced.</p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-medium">
                <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">Fact</span>
                <span className="rounded bg-violet-50 px-1.5 py-0.5 text-violet-700">Inference</span>
                <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">Assumption</span>
              </div>
              <div className="mt-3 flex gap-2">
                <span className="rounded-lg bg-ink px-3 py-1 text-[11px] font-medium text-white">Agree</span>
                <span className="rounded-lg border border-line px-3 py-1 text-[11px]">Partially</span>
                <span className="rounded-lg border border-line px-3 py-1 text-[11px]">Disagree</span>
              </div>
            </div>
          </div>
          <div className="hidden space-y-3 sm:block">
            <div className="rounded-xl border border-line p-3">
              <div className="text-[11px] font-semibold text-muted">Diagnostic readiness</div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-canvas"><div className="h-full w-[78%] rounded-full bg-gradient-to-r from-brand-500 to-violet-500" /></div>
              <div className="mt-1.5 text-[11px] tabular-nums text-subtle">78% coverage</div>
            </div>
            <div className="rounded-xl border border-line p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted"><BarChart3 className="h-3.5 w-3.5" /> Repeat rate by cohort</div>
              <svg viewBox="0 0 120 50" className="mt-2 w-full" aria-hidden>
                <polyline fill="none" stroke="#6366f1" strokeWidth="2" points="0,8 24,14 48,18 72,22 96,25 120,27" />
                <polyline fill="none" stroke="#f59e0b" strokeWidth="2" points="0,9 24,16 48,26 72,34 96,40 120,44" />
              </svg>
            </div>
            <div className="flex items-end gap-2">
              <Owl size={56} />
              <div className="mb-1 rounded-xl rounded-bl-sm bg-brand-50 px-2.5 py-1.5 text-[11px] text-brand-700">Ready to diagnose.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHead({ eyebrow, title, text, align = "center" }: { eyebrow: string; title: string; text: string; align?: "center" | "left" }) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-xl"}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
      <p className="mt-4 text-lg leading-relaxed text-muted">{text}</p>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-6 text-center shadow-card">
      <div className="bg-gradient-to-br from-brand-600 to-violet-600 bg-clip-text text-4xl font-semibold tabular-nums tracking-tight text-transparent">{value}+</div>
      <div className="mt-1 text-sm text-muted">{label}</div>
    </div>
  );
}

function OutputCard({ icon: Icon, title, tone }: { icon: typeof FileText; title: string; tone: string }): ReactNode {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-pop">
      <span className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${tone} text-white shadow-md`}><Icon className="h-5 w-5" /></span>
      <div className="mt-4 font-semibold">{title}</div>
      <div className="mt-1 h-1.5 w-3/4 rounded-full bg-canvas" />
      <div className="mt-1.5 h-1.5 w-1/2 rounded-full bg-canvas" />
    </div>
  );
}
