import { api } from "@/server/http";
import { generateRecommendations } from "@/server/services/cases";

export const maxDuration = 300;

export const POST = api<{ id: string }>({ permission: "case.manage", rpm: 10 }, (_req, auth, { id }) =>
  generateRecommendations(auth, id),
);
