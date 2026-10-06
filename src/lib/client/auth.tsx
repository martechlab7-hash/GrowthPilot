"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getRedirectResult,
  signInWithRedirect,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  updateProfile,
} from "firebase/auth";
import type { Organization, UserProfile } from "@/domain/types";
import { apiFetch } from "./api";
import { firebaseAuth, isDemoMode, isFirebaseConfigured, missingFirebaseConfig } from "./firebase";

interface SessionUser {
  uid: string;
  email: string;
  name: string;
}

type Me =
  | { onboarded: false; email: string; name: string }
  | { onboarded: true; profile: UserProfile; organization: Organization | null };

interface AuthState {
  user: SessionUser | null;
  me: Me | null;
  /** Why the server rejected the signed-in user, if it did. */
  meError: string | null;
  loading: boolean;
  signInEmail(email: string, password: string): Promise<void>;
  signUpEmail(name: string, email: string, password: string): Promise<void>;
  signInGoogle(): Promise<void>;
  signOut(): Promise<void>;
  refreshMe(): Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  if (!isDemoMode && !isFirebaseConfigured) return <SetupRequired missing={missingFirebaseConfig} />;
  return <ConfiguredAuthProvider>{children}</ConfiguredAuthProvider>;
}

/** Shown instead of crashing when the deployment has no Firebase configuration. */
function SetupRequired({ missing }: { missing: string[] }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold">Setup required</h1>
      <p className="mt-2 text-sm text-muted">
        This deployment has no Firebase configuration. Add these environment variables in your hosting provider
        (e.g. Vercel → Project → Settings → Environment Variables), then redeploy — <code>NEXT_PUBLIC_*</code> values are
        baked in at build time.
      </p>
      <ul className="mt-4 space-y-1 rounded-lg border border-line bg-white p-4 font-mono text-sm">
        {missing.map((m) => <li key={m}>{m}</li>)}
      </ul>
      <p className="mt-4 text-sm text-muted">
        Server-side variables are also required: <code>FIREBASE_PROJECT_ID</code>, <code>FIREBASE_CLIENT_EMAIL</code>,{" "}
        <code>FIREBASE_PRIVATE_KEY</code> and <code>CREDENTIALS_ENCRYPTION_KEYS</code>. See <code>.env.example</code>.
        To preview without Firebase, set <code>GROWTHPILOT_DEMO_MODE=true</code> and <code>NEXT_PUBLIC_DEMO_MODE=true</code>{" "}
        (single shared demo user — not for real data).
      </p>
    </main>
  );
}

function ConfiguredAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [meError, setMeError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    try {
      setMe(await apiFetch<Me>("/api/me"));
      setMeError(null);
    } catch (e) {
      setMe(null);
      setMeError(e instanceof Error ? e.message : "The server rejected this session.");
    }
  }, []);

  useEffect(() => {
    if (isDemoMode) {
      const demo = sessionStorageGet("gp-demo-signed-out") ? null : { uid: "demo-user", email: "demo@growthpilot.local", name: "Demo Strategist" };
      (demo ? apiFetch<Me>("/api/me") : Promise.resolve(null))
        .then((m) => setMe(m), () => setMe(null))
        .finally(() => {
          setUser(demo);
          setLoading(false);
        });
      return;
    }
    getRedirectResult(firebaseAuth()).catch((e: { code?: string; message?: string }) => {
      setMeError(`Google sign-in failed (${e.code ?? e.message ?? "unknown error"}).`);
    });
    return onIdTokenChanged(firebaseAuth(), async (u) => {
      setUser(u ? { uid: u.uid, email: u.email ?? "", name: u.displayName ?? u.email ?? "User" } : null);
      if (u) await refreshMe();
      else setMe(null);
      setLoading(false);
    });
  }, [refreshMe]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      me,
      meError,
      loading,
      async signInEmail(email, password) {
        if (isDemoMode) return demoSignIn(setUser, refreshMe);
        await signInWithEmailAndPassword(firebaseAuth(), email, password);
      },
      async signUpEmail(name, email, password) {
        if (isDemoMode) return demoSignIn(setUser, refreshMe);
        const cred = await createUserWithEmailAndPassword(firebaseAuth(), email, password);
        if (name) await updateProfile(cred.user, { displayName: name });
      },
      async signInGoogle() {
        if (isDemoMode) return demoSignIn(setUser, refreshMe);
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        try {
          await signInWithPopup(firebaseAuth(), provider);
        } catch (e) {
          const code = (e as { code?: string }).code ?? "";
          // Popups blocked or unsupported (some mobile/in-app browsers): fall back to a full-page redirect.
          if (code.includes("popup-blocked") || code.includes("operation-not-supported")) {
            await signInWithRedirect(firebaseAuth(), provider);
            return;
          }
          throw e;
        }
      },
      async signOut() {
        if (isDemoMode) {
          sessionStorageSet("gp-demo-signed-out", "1");
          setUser(null);
          setMe(null);
          return;
        }
        await fbSignOut(firebaseAuth());
      },
      refreshMe,
    }),
    [user, me, meError, loading, refreshMe],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

async function demoSignIn(setUser: (u: SessionUser) => void, refreshMe: () => Promise<void>) {
  sessionStorageSet("gp-demo-signed-out", "");
  setUser({ uid: "demo-user", email: "demo@growthpilot.local", name: "Demo Strategist" });
  await refreshMe();
}

function sessionStorageGet(k: string) {
  try {
    return sessionStorage.getItem(k);
  } catch {
    return null;
  }
}
function sessionStorageSet(k: string, v: string) {
  try {
    sessionStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
}

export function useAuth(): AuthState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
