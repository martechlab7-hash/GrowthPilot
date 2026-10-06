/**
 * Product identity is configuration, not code. Override via environment
 * variables so the platform can be white-labelled or renamed without edits.
 */
export const product = {
  name: process.env.NEXT_PUBLIC_PRODUCT_NAME ?? "GrowthPilot",
  tagline:
    process.env.NEXT_PUBLIC_PRODUCT_TAGLINE ??
    "Marketing Strategy & Diagnostic Workbench",
  description:
    "An AI-powered marketing strategy and diagnostic workbench that thinks like a senior strategist.",
} as const;
