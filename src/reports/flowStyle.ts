/** Colours and labels for journey step types, shared by every report renderer. */
export const FLOW_STYLE: Record<string, { label: string; stroke: string; fill: string }> = {
  trigger: { label: "Trigger", stroke: "#2563EB", fill: "#EFF6FF" },
  wait: { label: "Wait", stroke: "#64748B", fill: "#F1F5F9" },
  condition: { label: "Decision", stroke: "#D97706", fill: "#FFFBEB" },
  action: { label: "Action", stroke: "#7C3AED", fill: "#F5F3FF" },
  channel: { label: "Channel", stroke: "#059669", fill: "#ECFDF5" },
  measure: { label: "Measure", stroke: "#0891B2", fill: "#ECFEFF" },
};
export const flowStyle = (type: string) => FLOW_STYLE[type] ?? FLOW_STYLE.action!;

/** One line per branch, e.g. "Yes → Send offer". */
export const branchLines = (s: { branches?: { label: string; target?: string }[] }) =>
  (s.branches ?? []).map((b) => (b.target ? `${b.label} → ${b.target}` : b.label));
