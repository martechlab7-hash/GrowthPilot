import { inflateSync } from "node:zlib";
import type { BrandProfile } from "@/domain/types";

export interface LogoAsset {
  data: Buffer;
  base64: string;
  width: number;
  height: number;
}

/** Decoded logo, if the brand has one. */
export function logoOf(brand: BrandProfile): LogoAsset | null {
  const url = brand.logoDataUrl;
  if (!url) return null;
  const base64 = url.slice(url.indexOf(",") + 1);
  const data = Buffer.from(base64, "base64");
  // A corrupt image makes renderers fail asynchronously (crashing the process),
  // so only well-formed PNGs are ever embedded.
  if (!isValidPng(data)) return null;
  return { data, base64, width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
}

/** Structural PNG check: signature, IHDR, and IDAT data that actually inflates. */
export function isValidPng(data: Buffer): boolean {
  try {
    if (data.length < 33 || data.readUInt32BE(0) !== 0x89504e47 || data.toString("ascii", 12, 16) !== "IHDR") return false;
    const idat: Buffer[] = [];
    let off = 8;
    while (off + 8 <= data.length) {
      const len = data.readUInt32BE(off);
      const type = data.toString("ascii", off + 4, off + 8);
      if (off + 12 + len > data.length) return false;
      if (type === "IDAT") idat.push(data.subarray(off + 8, off + 8 + len));
      if (type === "IEND") break;
      off += 12 + len;
    }
    if (!idat.length) return false;
    inflateSync(Buffer.concat(idat));
    const w = data.readUInt32BE(16);
    const h = data.readUInt32BE(20);
    return w > 0 && h > 0 && w <= 4000 && h <= 4000;
  } catch {
    return false;
  }
}

/** Scale to fit a box, preserving aspect ratio. */
export function fit(w: number, h: number, maxW: number, maxH: number) {
  const s = Math.min(maxW / w, maxH / h);
  return { width: w * s, height: h * s };
}

const SERIF = /georgia|times|garamond|merriweather|playfair|serif|lora|cambria/i;

/** PDF uses built-in fonts: pick the closest family to the brand font. */
export function pdfFonts(brand: BrandProfile) {
  const heading = SERIF.test(brand.headingFont ?? brand.fontFamily) ? "Times-Bold" : "Helvetica-Bold";
  const body = SERIF.test(brand.fontFamily) ? "Times-Roman" : "Helvetica";
  const bodyBold = SERIF.test(brand.fontFamily) ? "Times-Bold" : "Helvetica-Bold";
  return { heading, body, bodyBold };
}
