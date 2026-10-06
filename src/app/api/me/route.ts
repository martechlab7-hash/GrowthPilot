import { api, readJson } from "@/server/http";
import { BootstrapSchema, PreferencesSchema, bootstrapAccount, deleteAccount, getMe, updatePreferences } from "@/server/services/org";
import { adminAuth } from "@/server/firebaseAdmin";
import { env } from "@/server/env";

export const GET = api({ allowUnonboarded: true }, async (_req, auth) => getMe(auth));

/** First sign-in: create the organization and make the user its owner. */
export const POST = api({ allowUnonboarded: true, rpm: 10 }, async (req, auth) =>
  bootstrapAccount(auth, BootstrapSchema.parse(await readJson(req))),
);

export const DELETE = api({ rpm: 5 }, async (req, auth) => {
  const { confirm } = await readJson<{ confirm?: string }>(req);
  await deleteAccount(auth, confirm ?? "");
  if (!env.demoMode) await adminAuth().deleteUser(auth.uid);
  return { deleted: true };
});

/** Update the signed-in user's preferences (e.g. mascot). */
export const PATCH = api({ rpm: 30 }, async (req, auth) => updatePreferences(auth, PreferencesSchema.parse(await readJson(req))));
