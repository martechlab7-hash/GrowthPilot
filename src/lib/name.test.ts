import { describe, expect, it } from "vitest";
import { firstName, friendlyName, initials, needsName } from "./name";

describe("name helpers", () => {
  it("never shows a raw email", () => {
    expect(needsName("nmn227nmn@gmail.com")).toBe(true);
    expect(friendlyName("naman.sharma@acme.com")).toBe("Naman Sharma");
    expect(friendlyName("nmn227nmn@gmail.com")).toBe("Nmn Nmn");
    expect(firstName("Naman Sharma")).toBe("Naman");
    expect(initials("Naman Sharma")).toBe("NS");
    expect(needsName("Naman")).toBe(false);
  });
});
