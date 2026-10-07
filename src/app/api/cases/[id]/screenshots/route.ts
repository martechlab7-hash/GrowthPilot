import { api, readJson } from "@/server/http";
import { ScreenshotInputSchema, uploadScreenshot } from "@/server/services/comms";

export const POST = api<{ id: string }>({ permission: "case.contribute", rpm: 30 }, async (req, auth, { id }) =>
  uploadScreenshot(auth, id, ScreenshotInputSchema.parse(await readJson(req))),
);
