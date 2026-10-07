import { describe, expect, it } from "vitest";
import { analyzeTable, detectRoles, monthKey } from "./analyze";
import { parseDelimited } from "./csv";

/** Deterministic pseudo-random so the test is stable. */
function rng(seed: number) {
  return () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

function transactions() {
  const r = rng(7);
  const lines = ["customer_id,order_date,route,revenue"];
  for (let c = 0; c < 120; c++) {
    const start = Math.floor(r() * 4);
    const orders = 1 + Math.floor(r() * 5);
    for (let k = 0; k < orders; k++) {
      const m = Math.min(8, start + k * (1 + Math.floor(r() * 2)));
      lines.push(`ID-c${String(c).padStart(5, "0")},2026-${String(m + 1).padStart(2, "0")}-${String(1 + Math.floor(r() * 27)).padStart(2, "0")},${r() > 0.5 ? "DEL-BOM" : "DEL-BLR"},${(2000 + Math.floor(r() * 3000))}`);
    }
  }
  return parseDelimited(lines.join("\n"));
}

describe("deterministic analytics", () => {
  it("normalises month keys", () => {
    expect(monthKey("2026-03-14")).toBe("2026-03");
    expect(monthKey("14/03/2026")).toBe("2026-03");
    expect(monthKey("Mar 2026")).toBe("2026-03");
    expect(monthKey("hello")).toBeNull();
  });

  it("detects column roles", () => {
    const t = transactions();
    const r = detectRoles(t);
    expect(t.headers[r.id!]).toBe("customer_id");
    expect(t.headers[r.date!]).toBe("order_date");
    expect(t.headers[r.value!]).toBe("revenue");
    expect(r.segments.map((i) => t.headers[i])).toContain("route");
  });

  it("runs trend, cohort and RFM on transactions", () => {
    const kinds = analyzeTable(transactions(), "orders").map((a) => a.kind);
    expect(kinds).toEqual(expect.arrayContaining(["trend", "cohort", "rfm", "drivers"]));
  });

  it("finds the segment that drove a decline", () => {
    const rows = ["month,route,bookings"];
    for (const [m, a, b] of [["2026-01", 500, 300], ["2026-02", 510, 305], ["2026-03", 300, 298], ["2026-04", 280, 302]] as const) {
      rows.push(`${m},DEL-BOM,${a}`, `${m},DEL-BLR,${b}`);
    }
    const out = analyzeTable(parseDelimited(rows.join("\n")), "routes");
    const drivers = out.find((a) => a.kind === "drivers")!;
    expect(drivers.findings.join(" ")).toContain(`route "DEL-BOM" accounts for 99% of that change (-430)`);
    const trend = out.find((a) => a.kind === "trend")!;
    expect(trend.findings[0]).toContain("bookings went from 800 in 2026-01 to 582 in 2026-04");
  });

  it("measures funnel drop-off", () => {
    const t = parseDelimited("week,sessions,add_to_cart,checkout,orders\n2026-01-05,10000,1200,600,420\n2026-01-12,9800,1100,580,400");
    const f = analyzeTable(t).find((a) => a.kind === "funnel")!;
    expect(f.findings[1]).toBe("Biggest drop: sessions → add_to_cart (11.6% continue).");
  });
});
