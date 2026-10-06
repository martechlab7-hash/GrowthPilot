"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowRight, CheckCircle2, Compass } from "lucide-react";
import { product } from "@/config/product";
import { useAuth } from "@/lib/client/auth";
import { OwlSays } from "@/components/mascot";

const FLOW = ["Question", "Evidence", "Diagnosis", "Hypothesis", "Human validation", "Recommendation", "Activation", "Measurement", "Economics"];

export default function Landing() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col bg-[radial-gradient(60rem_30rem_at_top,var(--color-brand-100),transparent)] px-6 py-10">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold"><Compass className="h-5 w-5 text-brand-600" />{product.name}</div>
        <Link href="/login" className="text-sm font-medium text-brand-600 hover:underline">Sign in</Link>
      </header>
      <section className="mt-16">
        <OwlSays size={96}>Hi, I&apos;m Pilot. Tell me what&apos;s going wrong and I&apos;ll ask the right questions before I recommend anything.</OwlSays>
      </section>
      <section className="mt-10 max-w-3xl">
        <p className="text-sm font-medium uppercase tracking-wider text-brand-600">{product.tagline}</p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          An AI marketing strategist that investigates before it recommends.
        </h1>
        <p className="mt-5 text-lg text-muted">
          Describe a business problem. {product.name} runs a structured consulting diagnostic, asks the questions with the highest
          information value, separates facts from assumptions, and only builds a strategy after you validate its hypotheses.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/login" className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-b from-brand-500 to-brand-600 px-5 text-sm font-medium text-white shadow-pop hover:from-brand-600 hover:to-brand-700">
            Start a case <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
      <section className="mt-16 flex flex-wrap items-center gap-2 text-sm">
        {FLOW.map((s, i) => (
          <span key={s} className="flex items-center gap-2">
            <span className="rounded-full border border-line bg-white px-3 py-1">{s}</span>
            {i < FLOW.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-muted" />}
          </span>
        ))}
      </section>
      <section className="mt-16 grid gap-4 sm:grid-cols-3">
        {[
          ["B-D-C-D-T-A-M-E framework", "Business, Diagnosis, Customer, Data, Technology, Activation, Measurement, Economics."],
          ["Human-in-the-loop", "Agree, challenge or edit every hypothesis before the strategy is built."],
          ["Consulting-grade outputs", "Web report, PDF, Word and PowerPoint — with your brand."],
        ].map(([t, d]) => (
          <div key={t} className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <CheckCircle2 className="h-5 w-5 text-brand-600" />
            <h3 className="mt-3 font-semibold">{t}</h3>
            <p className="mt-1 text-sm text-muted">{d}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
