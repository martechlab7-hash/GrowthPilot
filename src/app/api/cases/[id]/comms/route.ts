import { z } from "zod";
import { api, readJson } from "@/server/http";
import { reviewLinkedPages, reviewScreenshots } from "@/server/services/comms";

const Body = z.object({ target: z.enum(["pages", "screenshots"]) });

/** Re-run Pilot's review of linked pages or screenshots. */
export const POST = api<{ id: string }>({ permission: "case.contribute", rpm: 10 }, async (req, auth, { id }) => {
  const { target } = Body.parse(await readJson(req));
  return target === "pages" ? reviewLinkedPages(auth, id) : reviewScreenshots(auth, id, { all: true });
});
