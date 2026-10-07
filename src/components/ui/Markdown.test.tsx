import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Markdown, parseBlocks } from "./Markdown";

describe("Markdown", () => {
  it("groups lists and headings", () => {
    const blocks = parseBlocks("## Summary\nOpen rate fell.\n\n- one\n- two\n1. first\n***\nEnd");
    expect(blocks.map((b) => b.kind)).toEqual(["h", "p", "ul", "ol", "p"]);
  });

  it("renders emphasis without leaking asterisks", () => {
    const html = renderToStaticMarkup(<Markdown text={"The **main driver** is *timing*. ***Key:*** test it. Stray ** marker"} />);
    expect(html).toContain("<strong");
    expect(html).toContain("<em>timing</em>");
    expect(html).not.toContain("*");
  });

  it("never renders raw HTML", () => {
    const html = renderToStaticMarkup(<Markdown text={"<script>alert(1)</script>"} />);
    expect(html).not.toContain("<script>");
  });
});
