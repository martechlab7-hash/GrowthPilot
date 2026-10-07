import { ArrowRight, BarChart3, Clock, GitBranch, Megaphone, MousePointerClick, Zap } from "lucide-react";
import { cn } from "@/lib/cn";

export interface FlowStep {
  type: string;
  label: string;
  branches?: { label: string; target?: string }[];
}

const STYLE: Record<string, { label: string; box: string; chip: string; icon: typeof Zap }> = {
  trigger: { label: "Trigger", box: "border-blue-200 bg-blue-50", chip: "bg-blue-600", icon: Zap },
  wait: { label: "Wait", box: "border-slate-200 bg-slate-50", chip: "bg-slate-500", icon: Clock },
  condition: { label: "Decision", box: "border-amber-200 bg-amber-50", chip: "bg-amber-500", icon: GitBranch },
  action: { label: "Action", box: "border-violet-200 bg-violet-50", chip: "bg-violet-600", icon: MousePointerClick },
  channel: { label: "Channel", box: "border-emerald-200 bg-emerald-50", chip: "bg-emerald-600", icon: Megaphone },
  measure: { label: "Measure", box: "border-cyan-200 bg-cyan-50", chip: "bg-cyan-600", icon: BarChart3 },
};
const styleOf = (t: string) => STYLE[t] ?? STYLE.action!;

/** Activation journey drawn as a flowchart: numbered, colour-coded steps with decision branches. */
export function Flowchart({ steps, className }: { steps: FlowStep[]; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-stretch gap-y-3", className)} role="list" aria-label="Journey flowchart">
      {steps.map((s, i) => {
        const st = styleOf(s.type);
        const Icon = st.icon;
        return (
          <div key={i} role="listitem" className="flex items-center">
            <div className={cn("relative flex h-full w-48 flex-col rounded-xl border p-3 shadow-sm", st.box, s.type === "condition" && "border-dashed")}>
              <div className="flex items-center gap-1.5">
                <span className={cn("flex h-5 w-5 items-center justify-center rounded-md text-white", st.chip)}><Icon className="h-3 w-3" /></span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{i + 1} · {st.label}</span>
              </div>
              <p className="mt-1.5 text-sm font-medium leading-snug text-ink [overflow-wrap:anywhere]">{s.label}</p>
              {s.branches?.length ? (
                <div className="mt-2 space-y-1">
                  {s.branches.map((b) => (
                    <div key={b.label} className="rounded-md bg-white/80 px-2 py-1 text-[11px] leading-tight text-slate-600 ring-1 ring-amber-200">
                      <span className="font-semibold text-amber-700">{b.label}</span>{b.target ? <> → {b.target}</> : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            {i < steps.length - 1 && <ArrowRight className="mx-1.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />}
          </div>
        );
      })}
    </div>
  );
}

/** Convert stored journey steps (branches point at step ids) into flowchart steps. */
export function toFlowSteps(steps: { id: string; type: string; label: string; branches?: { label: string; next: string }[] }[]): FlowStep[] {
  const byId = new Map(steps.map((s) => [s.id, s.label]));
  return steps.map((s) => ({
    type: s.type,
    label: s.label,
    ...(s.branches?.length ? { branches: s.branches.map((b) => ({ label: b.label, ...(byId.get(b.next) ? { target: byId.get(b.next)! } : {}) })) } : {}),
  }));
}
