import { api } from "@/server/http";
import { generatePlan } from "@/server/services/cases";

export const maxDuration = 300;

/** Activation journeys, customer journey map, measurement and experiments. */
export const POST = api<{ id: string }>({ permission: "case.manage", rpm: 10 }, (_req, auth, { id }) =>
  generatePlan(auth, id),
);
