import type { Pace, RoadmapTask, StrategySettings } from "@/domain/types";

/**
 * Roadmap scheduler. The same task list becomes three plans:
 *
 *  - aggressive: more parallel lanes per workstream; parallelisable tasks are
 *    shortened only when extra resources are available. Dependencies and
 *    approvals are never compressed.
 *  - balanced: one team per workstream (a second lane for parallelisable work
 *    when resources allow), standard durations.
 *  - conservative: one lane, longer approvals, and a pilot-and-validate gate
 *    after every launch; anything that depended on the launch waits for it.
 *
 * Output: start/end weeks, the critical path, dates, and feasibility against
 * the horizon and the target launch date, with trade-offs when it does not fit.
 */

export interface ScheduledTask extends RoadmapTask {
  start: number;
  end: number;
  critical: boolean;
  /** Added by the scheduler (pilot gates in conservative plans). */
  generated?: boolean;
}

export interface Schedule {
  pace: Pace;
  tasks: ScheduledTask[];
  totalWeeks: number;
  criticalPath: string[];
  startDate: string;
  endDate: string;
  firstLaunchWeek: number | null;
  /** Problems a planner must resolve (horizon, launch date, dependency cycles). */
  issues: string[];
  /** Trade-offs when the target date is not reachable. */
  tradeoffs: string[];
  /** Tasks needed for the earliest launch: the minimum viable launch. */
  minimumViableLaunch: string[];
}

export const HORIZON_WEEKS: Record<StrategySettings["horizon"], number> = { "30d": 4.3, "90d": 13, "180d": 26, "12m": 52 };
const APPROVAL_WEEKS: Record<string, number> = { "A few days": 0.5, "About a week": 1, "2–4 weeks": 3, "More than a month": 5 };

export function approvalWeeksFrom(answer: unknown): number {
  return typeof answer === "string" && answer in APPROVAL_WEEKS ? APPROVAL_WEEKS[answer]! : 1;
}

const round = (n: number) => Math.round(n * 10) / 10;

function lanesFor(pace: Pace, resources: StrategySettings["resources"], parallelizable: boolean): number {
  if (!parallelizable) return 1;
  if (pace === "aggressive") return resources === "flexible" ? 3 : 2;
  if (pace === "balanced") return resources === "existing" ? 1 : 2;
  return 1;
}

function durationFor(t: RoadmapTask, pace: Pace, resources: StrategySettings["resources"], approvalWeeks: number): number {
  let work = t.weeks;
  // Only parallelisable work shrinks, and only with people to do it.
  if (pace === "aggressive" && t.parallelizable && resources !== "existing") work = Math.max(0.5, work * (resources === "flexible" ? 0.7 : 0.85));
  const approval = t.approval ? approvalWeeks * (pace === "conservative" ? 1.5 : 1) : 0;
  return round(work + approval);
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Math.round(days));
  return d.toISOString().slice(0, 10);
}

export function weekToDate(startDate: string, week: number): string {
  return addDays(startDate, week * 7);
}

export function schedule(
  input: RoadmapTask[],
  opts: { pace: Pace; settings: Pick<StrategySettings, "resources" | "horizon" | "launchDate">; approvalWeeks?: number; startDate?: string },
): Schedule {
  const { pace } = opts;
  const resources = opts.settings.resources;
  const approvalWeeks = opts.approvalWeeks ?? 1;
  const startDate = opts.startDate ?? new Date().toISOString().slice(0, 10);
  const issues: string[] = [];

  // Conservative plans validate every launch in a pilot before anything builds on it.
  let tasks: (RoadmapTask & { generated?: boolean })[] = input.map((t) => ({ ...t, dependsOn: [...t.dependsOn] }));
  if (pace === "conservative") {
    const pilots: (RoadmapTask & { generated: boolean })[] = [];
    for (const t of tasks.filter((x) => x.launch)) {
      const pilotId = `${t.id}-pilot`;
      pilots.push({
        id: pilotId, recommendationId: t.recommendationId, workstream: t.workstream, title: `Pilot and validate: ${t.title}`,
        owner: t.owner, weeks: 3, dependsOn: [t.id], parallelizable: false, approval: true,
        deliverable: "Go/no-go decision against the success criteria", launch: false, status: "todo", generated: true,
      });
      for (const other of tasks) if (other.dependsOn.includes(t.id)) other.dependsOn = other.dependsOn.map((d) => (d === t.id ? pilotId : d));
    }
    tasks = [...tasks, ...pilots];
  }

  const byId = new Map(tasks.map((t) => [t.id, t]));
  for (const t of tasks) {
    const unknown = t.dependsOn.filter((d) => !byId.has(d));
    if (unknown.length) {
      issues.push(`"${t.title}" depends on unknown task(s) ${unknown.join(", ")}; ignored.`);
      t.dependsOn = t.dependsOn.filter((d) => byId.has(d));
    }
  }

  // Topological order (Kahn); a cycle is reported and broken.
  const indeg = new Map(tasks.map((t) => [t.id, t.dependsOn.length]));
  const order: typeof tasks = [];
  const queue = tasks.filter((t) => t.dependsOn.length === 0);
  const placed = new Set<string>();
  while (order.length < tasks.length) {
    const next = queue.shift();
    if (!next) {
      const stuck = tasks.find((t) => !placed.has(t.id))!;
      issues.push(`Circular dependency around "${stuck.title}"; its dependencies were ignored.`);
      stuck.dependsOn = stuck.dependsOn.filter((d) => placed.has(d));
      queue.push(stuck);
      continue;
    }
    if (placed.has(next.id)) continue;
    placed.add(next.id);
    order.push(next);
    for (const t of tasks) {
      if (placed.has(t.id) || !t.dependsOn.includes(next.id)) continue;
      const left = (indeg.get(t.id) ?? 1) - 1;
      indeg.set(t.id, left);
      if (left <= 0 && t.dependsOn.every((d) => placed.has(d))) queue.push(t);
    }
  }

  // List scheduling: each workstream has lanes; a task takes the earliest free allowed lane.
  const lanes = new Map<string, number[]>();
  const done = new Map<string, { start: number; end: number; drivenBy?: string }>();
  const laneOwner = new Map<string, string[]>();
  for (const t of order) {
    const depEnd = Math.max(0, ...t.dependsOn.map((d) => done.get(d)?.end ?? 0));
    const depDriver = t.dependsOn.find((d) => (done.get(d)?.end ?? -1) === depEnd);
    const ws = lanes.get(t.workstream) ?? [0, 0, 0];
    const owners = laneOwner.get(t.workstream) ?? ["", "", ""];
    const allowed = lanesFor(pace, resources, t.parallelizable);
    let lane = 0;
    for (let i = 1; i < allowed; i++) if (ws[i]! < ws[lane]!) lane = i;
    const start = Math.max(depEnd, ws[lane]!);
    const end = round(start + durationFor(t, pace, resources, approvalWeeks));
    ws[lane] = end;
    const drivenBy = start === depEnd && depDriver ? depDriver : owners[lane] || undefined;
    owners[lane] = t.id;
    lanes.set(t.workstream, ws);
    laneOwner.set(t.workstream, owners);
    done.set(t.id, { start: round(start), end, ...(drivenBy && start > 0 ? { drivenBy } : {}) });
  }

  const totalWeeks = round(Math.max(0, ...[...done.values()].map((d) => d.end)));
  // Critical path: walk back from the last task through whatever set its start.
  const criticalPath: string[] = [];
  let cursor = [...done.entries()].sort((a, b) => b[1].end - a[1].end)[0]?.[0];
  while (cursor && !criticalPath.includes(cursor)) {
    criticalPath.unshift(cursor);
    cursor = done.get(cursor)?.drivenBy;
  }

  const scheduled: ScheduledTask[] = order.map((t) => ({ ...t, start: done.get(t.id)!.start, end: done.get(t.id)!.end, critical: criticalPath.includes(t.id) }));
  scheduled.sort((a, b) => a.start - b.start || a.end - b.end);

  const launches = scheduled.filter((t) => t.launch);
  const firstLaunch = launches.sort((a, b) => a.end - b.end)[0];
  const tradeoffs: string[] = [];
  const minimumViableLaunch = firstLaunch ? ancestors(firstLaunch.id, byId) : [];

  const horizon = HORIZON_WEEKS[opts.settings.horizon];
  if (totalWeeks > horizon * 1.05) {
    issues.push(`This plan needs about ${Math.ceil(totalWeeks)} weeks, longer than the ${opts.settings.horizon} horizon.`);
  }
  if (opts.settings.launchDate && firstLaunch) {
    const launchWeek = (Date.parse(`${opts.settings.launchDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / (7 * 86_400_000);
    if (firstLaunch.end > launchWeek + 0.2) {
      const late = Math.ceil(firstLaunch.end - launchWeek);
      issues.push(`The first launch lands about ${late} week${late === 1 ? "" : "s"} after the target date (${opts.settings.launchDate}).`);
      tradeoffs.push(
        `Minimum viable launch: deliver only the ${minimumViableLaunch.length} task(s) the launch depends on first, and move everything else to an optimisation phase after launch.`,
        resources === "flexible" ? "Add people to the critical-path workstreams; parallel work is already assumed." : "Add capacity (agency or contractors) to the critical-path workstreams so they can run in parallel.",
        "Pre-book approvals for launch assets so review time overlaps with production.",
        `Or move the target date to about ${weekToDate(startDate, Math.ceil(firstLaunch.end))}.`,
      );
    }
  }

  return {
    pace,
    tasks: scheduled,
    totalWeeks,
    criticalPath,
    startDate,
    endDate: weekToDate(startDate, totalWeeks),
    firstLaunchWeek: firstLaunch ? firstLaunch.end : null,
    issues,
    tradeoffs,
    minimumViableLaunch,
  };
}

function ancestors(id: string, byId: Map<string, RoadmapTask>): string[] {
  const out = new Set<string>();
  const walk = (x: string) => {
    if (out.has(x)) return;
    out.add(x);
    for (const d of byId.get(x)?.dependsOn ?? []) walk(d);
  };
  walk(id);
  return [...out];
}
