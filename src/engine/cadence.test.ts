import { describe, expect, it } from "vitest";
import { analyzeCadence, formatCadenceRow, parseCadenceRow } from "./cadence";

describe("cadence", () => {
  it("round-trips rows and tolerates loose input", () => {
    const row = { channel: "Email", purpose: "Weekly offers", frequency: "Weekly" as const, days: ["Tue" as const], time: "10:00", mode: "Scheduled" as const };
    expect(formatCadenceRow(row)).toBe("Email | Weekly offers | Weekly | Tue 10:00 | Scheduled");
    expect(parseCadenceRow(formatCadenceRow(row))).toEqual(row);
    expect(parseCadenceRow("SMS | Cart reminder | when triggered by an event | Varies | Triggered")?.mode).toBe("Triggered");
    expect(parseCadenceRow("Email | x | sometimes")).toBeNull();
    expect(parseCadenceRow("nonsense")).toBeNull();
  });

  it("computes weekly load per channel and day, and flags patterns", () => {
    const a = analyzeCadence(
      [
        "Email | Newsletter | Daily | Every day 09:00 | Scheduled",
        "SMS | Offers | Several times a week | Tue/Thu 09:00 | Scheduled",
        "WhatsApp | Promo | Weekly | Tue 09:00 | Scheduled",
      ],
      { problemTypes: ["winback"], channels: ["Email", "SMS", "WhatsApp", "Push"] },
    );
    expect(a.perWeek).toBe(11);
    expect(a.channels[0]).toMatchObject({ channel: "Email", perWeek: 7 });
    expect(a.byDay.Tue).toBe(3.5);
    const text = a.findings.join(" ");
    expect(text).toContain("about 11 a week");
    expect(text).toContain("more than one message a day");
    expect(text).toContain("none is triggered");
    expect(text).toMatch(/Tue carries/);
    expect(text).toContain("All timed sends go out at 09:00");
    expect(text).toContain("Push is listed as active");
    expect(text).toContain("inactivity or lapse");
  });

  it("only raises lifecycle gaps relevant to the case type", () => {
    const rows = ["Email | Welcome series | When triggered by an event | Varies | Triggered", "Email | News | Monthly | Varies | Scheduled"];
    expect(analyzeCadence(rows, { problemTypes: ["activation"] }).findings.join(" ")).not.toContain("onboarding");
    expect(analyzeCadence(rows, { problemTypes: ["conversion"] }).findings.join(" ")).toContain("abandonment");
    expect(analyzeCadence([], {}).findings).toEqual([]);
  });
});
