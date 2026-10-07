import { describe, expect, it } from "vitest";
import { parseDelimited } from "./csv";
import { detectPiiColumns, maskColumns, maskFreeText, pseudonym } from "./pii";
import { profileTable } from "./profile";

const csv = `customer_name,email,route,month,bookings,revenue
"Sharma, Naman",naman@example.com,DEL-BOM,2026-01,4,"12,500"
Priya K,priya@example.com,DEL-BLR,2026-01,2,6400
Amit R,amit@example.com,DEL-BOM,2026-02,1,3100`;

describe("shared data", () => {
  it("parses quoted CSV", () => {
    const t = parseDelimited(csv);
    expect(t.headers).toEqual(["customer_name", "email", "route", "month", "bookings", "revenue"]);
    expect(t.rows[0]![0]).toBe("Sharma, Naman");
    expect(parseDelimited("a\tb\n1\t2").rows).toEqual([["1", "2"]]);
  });

  it("flags personal-data columns and masks or removes them", () => {
    const t = parseDelimited(csv);
    const pii = detectPiiColumns(t);
    expect(pii.map((p) => p.name)).toEqual(["customer_name", "email"]);
    const safe = maskColumns(t, [0], [1]);
    expect(safe.headers).toEqual(["customer_name", "route", "month", "bookings", "revenue"]);
    expect(safe.rows[0]![0]).toBe(pseudonym("Sharma, Naman"));
    expect(JSON.stringify(safe)).not.toContain("example.com");
    expect(detectPiiColumns(parseDelimited("contact,amount\nx@y.co,1\nz@w.io,2"))[0]?.reason).toContain("email");
  });

  it("profiles columns without exposing every row", () => {
    const p = profileTable(maskColumns(parseDelimited(csv), [0], [1]), 2);
    const rev = p.columns.find((c) => c.name === "revenue")!;
    expect(rev).toMatchObject({ type: "number", min: 3100, max: 12500, sum: 22000 });
    expect(p.columns.find((c) => c.name === "month")!.type).toBe("date");
    expect(p.columns.find((c) => c.name === "route")!.top![0]).toEqual({ value: "DEL-BOM", count: 2 });
    expect(p.sample.split("\n")).toHaveLength(3);
  });

  it("masks emails and phone numbers in pasted text, keeping years", () => {
    const r = maskFreeText("Call +91 98765 43210 or mail a.b@c.com about 2026 bookings");
    expect(r.text).toBe("Call [number removed] or mail [email removed] about 2026 bookings");
    expect(r.masked).toBe(2);
  });
});
