import type { ActivationJourney, Case } from "@/domain/types";

/**
 * Turns an activation journey into a build spec for the client's own
 * engagement platform: vendor-specific component names, audience, control
 * group and measurement, as JSON, a Markdown build brief or a CSV step list.
 * Nothing is pushed to the vendor; the team builds from the spec.
 */
type StepType = ActivationJourney["steps"][number]["type"];

interface Platform {
  name: string;
  /** Matches entries from the interview's MarTech vendor list. */
  match: RegExp;
  build: string;
  components: Record<StepType, string>;
  control: string;
}

const PLATFORMS: Platform[] = [
  { name: "Braze", match: /braze/i, build: "Canvas", control: "Canvas control variant or Global Control Group", components: { trigger: "Entry: action-based or API-triggered Canvas entry", wait: "Delay step", condition: "Decision Split / Audience Paths", action: "User Update / Action Paths", channel: "Message step", measure: "Canvas conversion event" } },
  { name: "MoEngage", match: /moengage/i, build: "Flow", control: "Flow control group", components: { trigger: "Flow entry trigger (event)", wait: "Wait", condition: "Conditional split", action: "Update user attribute", channel: "Action: send message", measure: "Conversion goal" } },
  { name: "CleverTap", match: /clevertap/i, build: "Journey", control: "Journey control group", components: { trigger: "Journey entry (event / segment)", wait: "Delay", condition: "Split by property / event", action: "Update profile", channel: "Message node", measure: "Conversion goal" } },
  { name: "Iterable", match: /iterable/i, build: "Studio workflow", control: "Holdout group", components: { trigger: "Workflow trigger", wait: "Delay", condition: "Filter / Yes-No split", action: "Update user", channel: "Send node", measure: "Experiment / conversion" } },
  { name: "Salesforce Marketing Cloud", match: /salesforce marketing cloud/i, build: "Journey Builder journey", control: "Random Split to a hold-out path", components: { trigger: "Entry source (API event / data extension)", wait: "Wait by duration", condition: "Decision Split", action: "Update Contact", channel: "Email / SMS / Push activity", measure: "Journey goal" } },
  { name: "Adobe Journey Optimizer", match: /adobe journey optimizer|adobe campaign/i, build: "Journey", control: "Experimentation (control treatment)", components: { trigger: "Unitary event or Read audience", wait: "Wait", condition: "Condition", action: "Custom action", channel: "Channel action", measure: "Journey reporting / experiment" } },
  { name: "HubSpot", match: /hubspot/i, build: "Workflow", control: "Random A/B branch to a no-send path", components: { trigger: "Enrollment trigger", wait: "Delay", condition: "If/then branch", action: "Set property value", channel: "Send email / SMS", measure: "Workflow goal" } },
  { name: "Klaviyo", match: /klaviyo/i, build: "Flow", control: "Conditional split to a holdout", components: { trigger: "Flow trigger (metric / list)", wait: "Time delay", condition: "Conditional split", action: "Update profile property", channel: "Email / SMS", measure: "Conversion metric" } },
  { name: "Customer.io", match: /customer\.io/i, build: "Campaign", control: "Holdout / A/B test", components: { trigger: "Campaign trigger", wait: "Time delay", condition: "True/False branch", action: "Attribute update", channel: "Message", measure: "Conversion goal" } },
];

const GENERIC: Platform = {
  name: "Your engagement platform", match: /$^/, build: "journey / flow", control: "Random holdout group",
  components: { trigger: "Entry trigger", wait: "Wait / delay", condition: "Decision split", action: "Profile update / action", channel: "Message", measure: "Conversion goal" },
};

export function platformFor(c: Pick<Case, "context">): Platform {
  const vendors = c.context.fields["technology.vendors"]?.value;
  const list = Array.isArray(vendors) ? vendors.map(String) : [];
  return PLATFORMS.find((p) => list.some((v) => p.match.test(v))) ?? GENERIC;
}

export interface JourneySpec {
  journey: string;
  objective: string;
  platform: string;
  buildAs: string;
  audience: string;
  channels: string[];
  controlGroup: string;
  controlHow: string;
  steps: { n: number; type: StepType; label: string; component: string; branches?: { label: string; goTo: string }[] }[];
  measurement: { northStar?: string; kpis: string[]; experiments: string[] };
  notes: string[];
}

export function journeySpec(c: Case, j: ActivationJourney): JourneySpec {
  const p = platformFor(c);
  const label = new Map(j.steps.map((s, i) => [s.id, `${i + 1}. ${s.label}`]));
  return {
    journey: j.name,
    objective: j.objective,
    platform: p.name,
    buildAs: p.build,
    audience: j.audience,
    channels: j.channels,
    controlGroup: j.controlGroup,
    controlHow: p.control,
    steps: j.steps.map((s, i) => ({
      n: i + 1,
      type: s.type,
      label: s.label,
      component: p.components[s.type],
      ...(s.branches?.length ? { branches: s.branches.map((b) => ({ label: b.label, goTo: label.get(b.next) ?? b.next })) } : {}),
    })),
    measurement: {
      ...(c.measurement?.northStar ? { northStar: c.measurement.northStar } : {}),
      kpis: (c.measurement?.kpis ?? []).slice(0, 6).map((k) => `${k.name}: ${k.definition}`),
      experiments: c.experiments.slice(0, 3).map((e) => `${e.hypothesis} (primary KPI: ${e.primaryKpi}; ${e.duration})`),
    },
    notes: [
      "Audience must use consented, contactable customers only; suppress recent complainers and anyone in another live journey.",
      `Keep the control group (${j.controlGroup}) untouched for the whole test so incrementality can be measured.`,
      "Generated by GrowthPilot from the validated strategy. Review copy, frequency caps and legal requirements before launch.",
    ],
  };
}

export function specToMarkdown(s: JourneySpec): string {
  const lines = [
    `# Build brief: ${s.journey}`,
    "",
    `**Objective:** ${s.objective}  `,
    `**Build in:** ${s.platform} as a ${s.buildAs}  `,
    `**Audience:** ${s.audience}  `,
    `**Channels:** ${s.channels.join(", ")}  `,
    `**Control group:** ${s.controlGroup} (${s.controlHow})`,
    "",
    "## Steps",
    "",
    "| # | Step | Type | Build with |",
    "|---|---|---|---|",
    ...s.steps.map((st) => `| ${st.n} | ${st.label}${st.branches ? `<br>${st.branches.map((b) => `${b.label} → ${b.goTo}`).join("<br>")}` : ""} | ${st.type} | ${st.component} |`),
    "",
    "## Measurement",
    "",
    ...(s.measurement.northStar ? [`- North Star: ${s.measurement.northStar}`] : []),
    ...s.measurement.kpis.map((k) => `- ${k}`),
    ...s.measurement.experiments.map((e) => `- Experiment: ${e}`),
    "",
    "## Before launch",
    "",
    ...s.notes.map((n) => `- ${n}`),
    "",
  ];
  return lines.join("\n");
}

export function specToCsv(s: JourneySpec): string {
  const q = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [
    ["step", "label", "type", "build_with", "branches"].join(","),
    ...s.steps.map((st) => [String(st.n), st.label, st.type, st.component, (st.branches ?? []).map((b) => `${b.label} -> ${b.goTo}`).join(" | ")].map(q).join(",")),
  ].join("\n");
}
