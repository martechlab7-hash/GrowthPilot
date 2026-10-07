import { describe, expect, it } from "vitest";
import type { ActivationJourney, Case } from "@/domain/types";
import { emptyContext, setField } from "@/engine/context";
import { journeySpec, platformFor, specToCsv, specToMarkdown } from "./journeyExport";

const j: ActivationJourney = {
  id: "j1", name: "Lapsed win-back", objective: "Bring back lapsed flyers", audience: "No booking in 90 days", channels: ["Email", "Push"], controlGroup: "10%",
  steps: [
    { id: "s1", type: "trigger", label: "No booking in 90 days" },
    { id: "s2", type: "condition", label: "Gold tier?", branches: [{ label: "Yes", next: "s3" }, { label: "No", next: "s4" }] },
    { id: "s3", type: "channel", label: "Personal offer" },
    { id: "s4", type: "channel", label: "Fare alert, email" },
  ],
};

describe("journey build spec", () => {
  it("maps steps to the client's platform", () => {
    const ctx = setField(emptyContext(), { key: "technology.vendors", value: ["Google Analytics 4", "Braze"], by: "u" });
    const c = { context: ctx, measurement: undefined, experiments: [] } as unknown as Case;
    expect(platformFor(c).name).toBe("Braze");
    const spec = journeySpec(c, j);
    expect(spec.buildAs).toBe("Canvas");
    expect(spec.steps[1]).toMatchObject({ component: "Decision Split / Audience Paths", branches: [{ label: "Yes", goTo: "3. Personal offer" }, { label: "No", goTo: "4. Fare alert, email" }] });
    expect(specToMarkdown(spec)).toContain("Build in:** Braze as a Canvas");
    expect(specToCsv(spec).split("\n")[4]).toBe('4,"Fare alert, email",channel,Message step,');
  });
  it("falls back to a generic platform", () => {
    expect(platformFor({ context: emptyContext() } as Case).name).toBe("Your engagement platform");
  });
});
