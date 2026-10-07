import { describe, expect, it } from "vitest";
import { describePage, isPrivateAddress, normalizeUrl, readPage } from "./page";

describe("URL policy", () => {
  it("accepts public http(s) URLs and adds a scheme", () => {
    expect(normalizeUrl("example.com/pricing")).toBe("https://example.com/pricing");
    expect(normalizeUrl("http://shop.example.co.uk/a?b=1#top")).toBe("http://shop.example.co.uk/a?b=1");
  });
  it("rejects private, local and non-web targets", () => {
    for (const bad of ["file:///etc/passwd", "ftp://example.com", "http://localhost:3000", "http://127.0.0.1", "http://10.0.0.5/admin", "http://169.254.169.254/latest/meta-data", "http://[::1]/", "http://user:pw@example.com", "https://example.com:8443", "http://printer.local", "intranet", "javascript:alert(1)"]) {
      expect(normalizeUrl(bad), bad).toBeNull();
    }
  });
  it("detects private addresses, including IPv4-mapped IPv6", () => {
    for (const ip of ["10.1.2.3", "172.16.0.1", "192.168.1.1", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "224.0.0.1"]) expect(isPrivateAddress(ip), ip).toBe(true);
    for (const ip of ["8.8.8.8", "172.32.0.1", "2606:4700::1111"]) expect(isPrivateAddress(ip), ip).toBe(false);
  });
});

describe("page reader", () => {
  const html = `<!doctype html><html><head><title>Acme &amp; Co | Running shoes</title>
    <meta name="description" content="Lightweight shoes for daily runs.">
    <script>var x = "<h1>not a heading</h1>";</script><style>h1{}</style></head>
    <body><h1>Run further, <em>feel lighter</em></h1><h2>Why runners switch</h2>
    <p>Get 20% off your first order. Free shipping over $50.</p>
    <p>Rated 4.8 by 12,000 customers. 30-day money-back guarantee.</p>
    <a href="/shop" class="btn">Shop now</a><a href="/about">About our long and winding company history page</a>
    <form><input type="email" name="email"><input type="hidden" name="t"><select name="size"></select><button type="submit">Sign up</button></form>
    <img src="a.jpg"><img src="b.jpg"></body></html>`;

  it("extracts what a marketer looks at", () => {
    const f = readPage(html);
    expect(f.title).toBe("Acme & Co | Running shoes");
    expect(f.description).toBe("Lightweight shoes for daily runs.");
    expect(f.headings).toEqual(["H1: Run further, feel lighter", "H2: Why runners switch"]);
    expect(f.ctas).toEqual(expect.arrayContaining(["Shop now", "Sign up"]));
    expect(f.forms).toBe(1);
    expect(f.formFields).toBe(2);
    expect(f.offers.join(" ")).toContain("20% off");
    expect(f.trustSignals.join(" ")).toContain("money-back guarantee");
    expect(f.images).toBe(2);
    expect(describePage("https://acme.test", f)).toContain("Calls to action: ");
  });

  it("copes with empty or hostile markup", () => {
    expect(readPage("").headings).toEqual([]);
    expect(readPage("<h1>&#x110000;&#99999999;</h1>").headings.length).toBe(1);
  });
});
