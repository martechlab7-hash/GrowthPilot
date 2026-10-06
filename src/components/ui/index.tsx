"use client";

import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import type { ConfidenceLevel, KnowledgeKind, Priority } from "@/domain/types";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md"; loading?: boolean }>(
  function Button({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
          size === "sm" ? "h-8 px-3 text-[13px]" : "h-10 px-4 text-sm",
          variant === "primary" && "bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-[0_1px_0_rgb(255_255_255/0.2)_inset,0_1px_2px_rgb(16_24_40/0.15)] hover:from-brand-600 hover:to-brand-700",
          variant === "secondary" && "bg-brand-50 text-brand hover:bg-brand-100",
          variant === "outline" && "border border-line-strong bg-white text-ink shadow-card hover:border-subtle hover:bg-canvas",
          variant === "ghost" && "text-muted hover:bg-ink/5 hover:text-ink",
          variant === "danger" && "bg-red-600 text-white shadow-card hover:bg-red-700",
          className,
        )}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {children}
      </button>
    );
  },
);

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-line bg-surface shadow-card", className)} {...props} />;
}

export function CardHeader({ title, description, action }: { title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4", className)} {...props} />;
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn("h-10 w-full rounded-xl border border-line-strong bg-white px-3 text-sm shadow-[0_1px_2px_rgb(16_24_40/0.04)] outline-none transition placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 disabled:bg-canvas", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn("w-full rounded-xl border border-line-strong bg-white px-3 py-2 text-sm shadow-[0_1px_2px_rgb(16_24_40/0.04)] outline-none transition placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15", className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, ...props }, ref) {
  return <select ref={ref} className={cn("h-10 w-full rounded-xl border border-line-strong bg-white px-3 text-sm shadow-[0_1px_2px_rgb(16_24_40/0.04)] outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15", className)} {...props} />;
});

export function Label({ children, htmlFor, hint }: { children: ReactNode; htmlFor?: string; hint?: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink">
      {children}
      {hint && <span className="ml-1 font-normal text-muted">{hint}</span>}
    </label>
  );
}

export function Badge({ className, tone = "neutral", children }: { className?: string; tone?: "neutral" | "blue" | "green" | "amber" | "red" | "violet"; children: ReactNode }) {
  const tones = {
    neutral: "bg-slate-100 text-slate-700 ring-slate-200",
    blue: "bg-brand-50 text-brand ring-brand-100",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    amber: "bg-amber-50 text-amber-800 ring-amber-100",
    red: "bg-red-50 text-red-700 ring-red-100",
    violet: "bg-violet-50 text-violet-700 ring-violet-100",
  };
  return <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-medium ring-1 ring-inset", tones[tone], className)}>{children}</span>;
}

/** Guardrail: facts, inferences and assumptions are always visually distinct. */
export function KindBadge({ kind }: { kind: KnowledgeKind | "recommendation" }) {
  const map = {
    fact: { tone: "green" as const, label: "Fact" },
    inference: { tone: "violet" as const, label: "Inference" },
    assumption: { tone: "amber" as const, label: "Assumption" },
    recommendation: { tone: "blue" as const, label: "Recommendation" },
  };
  const m = map[kind];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

export function ConfidenceBadge({ value }: { value: number | ConfidenceLevel }) {
  const level: ConfidenceLevel = typeof value === "number" ? (value >= 0.75 ? "high" : value >= 0.5 ? "medium" : "low") : value;
  const tone = level === "high" ? "green" : level === "medium" ? "amber" : "red";
  return (
    <Badge tone={tone}>
      {typeof value === "number" ? `${Math.round(value * 100)}%` : ""} {level} confidence
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const tone = { P0: "red", P1: "amber", P2: "blue", P3: "neutral" }[priority] as "red" | "amber" | "blue" | "neutral";
  return <Badge tone={tone}>{priority}</Badge>;
}

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-slate-100", className)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500 transition-all duration-500" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      {label}
    </div>
  );
}

export function EmptyState({ title, description, action, icon }: { title: string; description?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex animate-fade-in flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong bg-white/60 px-6 py-14 text-center">
      {icon && <div className="mb-3 text-muted">{icon}</div>}
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorNote({ error }: { error: string | null | undefined }) {
  if (!error) return null;
  return <div role="alert" className="animate-fade-in rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800">{error}</div>;
}

export function PageHeader({ title, description, action, eyebrow }: { title: string; description?: ReactNode; action?: ReactNode; eyebrow?: string }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <div className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-brand-600">{eyebrow}</div>}
        <h1 className="text-[26px] font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Chip({ active, onClick, children, disabled }: { active: boolean; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      disabled={disabled}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm transition-all duration-150 disabled:opacity-50",
        active ? "border-brand-500 bg-brand-50 text-brand shadow-[0_0_0_3px_rgb(99_102_241/0.12)]" : "border-line-strong bg-white text-slate-600 hover:border-subtle hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

export function StatCard({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>{label}</span>
        {icon && <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">{icon}</span>}
      </div>
      <div className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </Card>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-slate-200/70", className)} />;
}
