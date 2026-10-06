import type { Economics, EconomicsInputs, KnowledgeKind, ScenarioResult } from "@/domain/types";

export const ECONOMICS_DISCLAIMER =
  "Modelled estimate, not guaranteed revenue. Results depend on the stated lift assumptions and must be validated with controlled experiments.";

const HORIZON_MONTHS = 12;

/**
 * Deterministic business-case engine (spec §24–25). Calculations are done in
 * code, never by the language model, so numbers are reproducible and auditable.
 *
 * - Customers impacted      = eligible customers × lift
 * - Incremental revenue     = customers impacted × average annual value
 * - Incremental gross profit= incremental revenue × gross margin
 * - Program cost (12 mo)    = investment + monthly run cost × 12
 * - Net profit              = incremental gross profit − program cost
 * - ROI                     = net profit ÷ program cost
 * - Payback (months)        = investment ÷ (monthly gross profit − monthly run cost)
 */
export function computeScenario(
  inputs: EconomicsInputs,
  name: ScenarioResult["name"],
  liftPct: number,
): ScenarioResult {
  const customersImpacted = Math.round(inputs.eligibleCustomers * (liftPct / 100));
  const incrementalRevenue = customersImpacted * inputs.averageAnnualValue;
  const incrementalGrossProfit = incrementalRevenue * (inputs.grossMarginPct / 100);
  const programCost = inputs.investment + inputs.monthlyRunCost * HORIZON_MONTHS;
  const netProfit = incrementalGrossProfit - programCost;
  const roi = programCost > 0 ? netProfit / programCost : null;
  const monthlyNet = incrementalGrossProfit / HORIZON_MONTHS - inputs.monthlyRunCost;
  const paybackMonths =
    monthlyNet > 0 ? (inputs.investment > 0 ? inputs.investment / monthlyNet : 0) : null;
  return {
    name,
    liftPct,
    customersImpacted,
    incrementalRevenue: round2(incrementalRevenue),
    incrementalGrossProfit: round2(incrementalGrossProfit),
    programCost: round2(programCost),
    netProfit: round2(netProfit),
    roi: roi === null ? null : round2(roi),
    paybackMonths: paybackMonths === null ? null : Math.round(paybackMonths * 10) / 10,
  };
}

export function computeEconomics(
  inputs: EconomicsInputs,
  inputProvenance: Record<string, KnowledgeKind>,
  now = new Date().toISOString(),
): Economics {
  const { conservative, base, aggressive } = inputs.scenarioLifts;
  return {
    inputs,
    scenarios: [
      computeScenario(inputs, "conservative", conservative),
      computeScenario(inputs, "base", base),
      computeScenario(inputs, "aggressive", aggressive),
    ],
    inputProvenance,
    disclaimer: ECONOMICS_DISCLAIMER,
    calculatedAt: now,
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
