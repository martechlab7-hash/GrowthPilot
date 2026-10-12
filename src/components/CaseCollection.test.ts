import { describe, expect, it } from "vitest";
import { pageNumbers } from "./CaseCollection";

describe("pageNumbers", () => {
  it("shows every page when there are few", () => {
    expect(pageNumbers(1, 1)).toEqual([1]);
    expect(pageNumbers(2, 3)).toEqual([1, 2, 3]);
  });
  it("collapses distant pages into gaps", () => {
    expect(pageNumbers(6, 12)).toEqual([1, null, 5, 6, 7, null, 12]);
    expect(pageNumbers(1, 12)).toEqual([1, 2, null, 12]);
    expect(pageNumbers(12, 12)).toEqual([1, null, 11, 12]);
  });
});
