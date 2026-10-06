"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

export const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** NEXT_PUBLIC_* values are inlined at build time: redeploy after changing them. */
export const missingFirebaseConfig: string[] = [
  ["NEXT_PUBLIC_FIREBASE_API_KEY", config.apiKey],
  ["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", config.authDomain],
  ["NEXT_PUBLIC_FIREBASE_PROJECT_ID", config.projectId],
  ["NEXT_PUBLIC_FIREBASE_APP_ID", config.appId],
]
  .filter(([, v]) => !v)
  .map(([k]) => k as string);

export const isFirebaseConfigured = missingFirebaseConfig.length === 0;

let app: FirebaseApp | undefined;

export function firebaseAuth(): Auth {
  app ??= getApps().length ? getApp() : initializeApp(config);
  return getAuth(app);
}
