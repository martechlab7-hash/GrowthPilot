import "server-only";
import { cert, getApps, initializeApp, applicationDefault, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { env } from "./env";

let app: App | undefined;

export function adminApp(): App {
  if (app) return app;
  if (getApps().length) {
    app = getApps()[0]!;
    return app;
  }
  app = initializeApp({
    credential:
      env.firebaseClientEmail && env.firebasePrivateKey
        ? cert({ projectId: env.firebaseProjectId, clientEmail: env.firebaseClientEmail, privateKey: env.firebasePrivateKey })
        : applicationDefault(),
    projectId: env.firebaseProjectId,
    storageBucket: env.firebaseStorageBucket,
  });
  const db = getFirestore(app);
  db.settings({ ignoreUndefinedProperties: true });
  return app;
}

export const adminAuth = () => getAuth(adminApp());
export const adminDb = () => getFirestore(adminApp());
