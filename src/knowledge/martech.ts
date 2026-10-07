/**
 * MarTech vendor catalogue: groups for the interview UI and a mapping from
 * each vendor to the generic capabilities it provides, so the maturity
 * assessment and recommendations can reason about tools the client owns.
 */
export type Capability =
  | "CRM"
  | "CDP"
  | "Marketing automation"
  | "Email service provider"
  | "Personalisation engine"
  | "Web / product analytics"
  | "Attribution"
  | "Data warehouse"
  | "Loyalty platform"
  | "BI dashboards"
  | "Consent management"
  | "Customer service platform"
  | "ML / propensity models";

export interface VendorGroup {
  label: string;
  vendors: { name: string; capabilities: Capability[] }[];
}

export const VENDOR_GROUPS: VendorGroup[] = [
  {
    label: "Marketing clouds & suites",
    vendors: [
      { name: "Adobe Experience Platform (AEP / RT-CDP)", capabilities: ["CDP"] },
      { name: "Adobe Journey Optimizer", capabilities: ["Marketing automation"] },
      { name: "Adobe Campaign", capabilities: ["Marketing automation", "Email service provider"] },
      { name: "Adobe Target", capabilities: ["Personalisation engine"] },
      { name: "Adobe Analytics", capabilities: ["Web / product analytics"] },
      { name: "Salesforce Marketing Cloud", capabilities: ["Marketing automation", "Email service provider"] },
      { name: "Salesforce Data Cloud", capabilities: ["CDP"] },
      { name: "Salesforce Sales / Service Cloud", capabilities: ["CRM", "Customer service platform"] },
      { name: "Oracle Eloqua / Responsys", capabilities: ["Marketing automation", "Email service provider"] },
      { name: "Microsoft Dynamics 365 Marketing", capabilities: ["CRM", "Marketing automation"] },
      { name: "SAP Emarsys", capabilities: ["Marketing automation", "Email service provider"] },
    ],
  },
  {
    label: "Engagement & CRM orchestration",
    vendors: [
      { name: "Braze", capabilities: ["Marketing automation", "Email service provider"] },
      { name: "Iterable", capabilities: ["Marketing automation", "Email service provider"] },
      { name: "MoEngage", capabilities: ["Marketing automation", "Personalisation engine"] },
      { name: "CleverTap", capabilities: ["Marketing automation", "Web / product analytics"] },
      { name: "WebEngage", capabilities: ["Marketing automation"] },
      { name: "Netcore", capabilities: ["Marketing automation", "Email service provider"] },
      { name: "Insider", capabilities: ["Marketing automation", "Personalisation engine"] },
      { name: "Bloomreach", capabilities: ["CDP", "Marketing automation", "Personalisation engine"] },
      { name: "Klaviyo", capabilities: ["Marketing automation", "Email service provider"] },
      { name: "HubSpot", capabilities: ["CRM", "Marketing automation"] },
      { name: "Marketo (Adobe)", capabilities: ["Marketing automation"] },
      { name: "Customer.io", capabilities: ["Marketing automation"] },
      { name: "Mailchimp", capabilities: ["Email service provider"] },
      { name: "Twilio / SendGrid", capabilities: ["Email service provider"] },
    ],
  },
  {
    label: "CDP & data activation",
    vendors: [
      { name: "Segment (Twilio)", capabilities: ["CDP"] },
      { name: "mParticle", capabilities: ["CDP"] },
      { name: "Tealium", capabilities: ["CDP", "Consent management"] },
      { name: "Treasure Data", capabilities: ["CDP"] },
      { name: "Hightouch", capabilities: ["CDP"] },
      { name: "Census", capabilities: ["CDP"] },
      { name: "RudderStack", capabilities: ["CDP"] },
    ],
  },
  {
    label: "Analytics, attribution & experimentation",
    vendors: [
      { name: "Google Analytics 4", capabilities: ["Web / product analytics"] },
      { name: "Amplitude", capabilities: ["Web / product analytics"] },
      { name: "Mixpanel", capabilities: ["Web / product analytics"] },
      { name: "Heap / Contentsquare", capabilities: ["Web / product analytics"] },
      { name: "AppsFlyer", capabilities: ["Attribution"] },
      { name: "Adjust", capabilities: ["Attribution"] },
      { name: "Branch", capabilities: ["Attribution"] },
      { name: "Optimizely", capabilities: ["Personalisation engine"] },
      { name: "VWO", capabilities: ["Personalisation engine"] },
      { name: "Dynamic Yield", capabilities: ["Personalisation engine"] },
      { name: "Google Meridian / Robyn (MMM)", capabilities: ["Attribution", "ML / propensity models"] },
    ],
  },
  {
    label: "Data, BI & AI",
    vendors: [
      { name: "Snowflake", capabilities: ["Data warehouse"] },
      { name: "Google BigQuery", capabilities: ["Data warehouse"] },
      { name: "Databricks", capabilities: ["Data warehouse", "ML / propensity models"] },
      { name: "Amazon Redshift", capabilities: ["Data warehouse"] },
      { name: "Tableau", capabilities: ["BI dashboards"] },
      { name: "Power BI", capabilities: ["BI dashboards"] },
      { name: "Looker", capabilities: ["BI dashboards"] },
      { name: "Vertex AI / SageMaker", capabilities: ["ML / propensity models"] },
    ],
  },
  {
    label: "Commerce, service, loyalty & consent",
    vendors: [
      { name: "Shopify", capabilities: [] },
      { name: "Salesforce Commerce Cloud", capabilities: [] },
      { name: "Zendesk", capabilities: ["Customer service platform"] },
      { name: "Freshworks", capabilities: ["CRM", "Customer service platform"] },
      { name: "Intercom", capabilities: ["Customer service platform"] },
      { name: "Capillary", capabilities: ["Loyalty platform"] },
      { name: "Antavo", capabilities: ["Loyalty platform"] },
      { name: "OneTrust", capabilities: ["Consent management"] },
      { name: "Didomi", capabilities: ["Consent management"] },
    ],
  },
];

export const VENDOR_OPTIONS: string[] = VENDOR_GROUPS.flatMap((g) => g.vendors.map((v) => v.name));

const CAPS = new Map(VENDOR_GROUPS.flatMap((g) => g.vendors.map((v) => [v.name, v.capabilities] as const)));

/** Capabilities implied by the vendors a client uses. */
export function capabilitiesFromVendors(vendors: string[]): Capability[] {
  const out = new Set<Capability>();
  for (const v of vendors) for (const c of CAPS.get(v) ?? []) out.add(c);
  return [...out];
}
