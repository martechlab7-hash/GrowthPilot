import type { BrandProfile, Case } from "@/domain/types";
import { buildReportModel, type ReportModel } from "./model";
import { buildStrategyReportModel } from "./strategyModel";

/** The report model for any case: Strategy Builder cases get the strategy report. */
export function reportModelFor(c: Case, brand: BrandProfile): ReportModel {
  return c.kind === "strategy" && c.strategy ? buildStrategyReportModel(c, brand) : buildReportModel(c, brand);
}
