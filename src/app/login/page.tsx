"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Compass } from "lucide-react";
import { product } from "@/config/product";
import { Button, ErrorNote, Input, Label } from "@/components/ui";
import { Owl } from "@/components/mascot";
import { useAuth } from "@/lib/client/auth";
import { isDemoMode } from "@/lib/client/firebase";

export default function LoginPage() {
  const auth = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (auth.loading || !auth.user || !auth.me) return;
    router.replace(auth.me.onboarded ? "/dashboard" : "/onboarding");
  }, [auth.loading, auth.user, auth.me, router]);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-brand-700 via-brand to-violet-700 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -left-24 bottom-0 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex items-center gap-2.5 text-lg font-semibold"><Compass className="h-5 w-5" /> {product.name}</div>
        <div className="relative max-w-md">
          <div className="mb-6 inline-block rounded-3xl bg-white/95 p-2 shadow-pop"><Owl size={120} /></div>
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">An AI strategist that investigates before it recommends.</h2>
          <ul className="mt-6 space-y-2 text-sm text-white/85">
            <li>✓ Consulting-style interview that asks the highest-value questions first</li>
            <li>✓ Facts, inferences and assumptions always labelled</li>
            <li>✓ You validate every hypothesis before the strategy is built</li>
            <li>✓ Branded PDF, Word and PowerPoint deliverables</li>
          </ul>
        </div>
        <p className="relative text-xs text-white/60">{product.tagline}</p>
      </section>
      <section className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-6">
          <div>
            <div className="mb-4 lg:hidden"><Owl size={72} /></div>
            <h1 className="text-2xl font-semibold tracking-tight">{mode === "signin" ? `Welcome back` : "Create your account"}</h1>
            <p className="mt-1 text-sm text-muted">{mode === "signin" ? `Sign in to ${product.name}` : "Start your first marketing case in minutes."}</p>
          </div>
          {isDemoMode ? (
            <>
              <p className="text-center text-sm text-muted">Demo mode: data is stored locally on this server.</p>
              <Button className="w-full" loading={busy} onClick={() => run(auth.signInGoogle)}>Enter demo workspace</Button>
            </>
          ) : (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                run(() => (mode === "signin" ? auth.signInEmail(email, password) : auth.signUpEmail(name, email, password)));
              }}
            >
              {mode === "signup" && (
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                </div>
              )}
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signin" ? "current-password" : "new-password"} />
              </div>
              <ErrorNote error={error} />
              {auth.user && !auth.me && auth.meError && (
                <div role="alert" className="space-y-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  <p>Signed in as {auth.user.email}, but the server could not load your account: {auth.meError}</p>
                  <div className="flex gap-3">
                    <button type="button" className="font-medium underline" onClick={() => run(auth.refreshMe)}>Retry</button>
                    <button type="button" className="font-medium underline" onClick={() => run(auth.signOut)}>Sign out</button>
                  </div>
                </div>
              )}
              <Button type="submit" className="w-full" loading={busy}>{mode === "signin" ? "Sign in" : "Create account"}</Button>
              <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={() => run(auth.signInGoogle)}>Continue with Google</Button>
              <p className="text-center text-sm text-muted">
                {mode === "signin" ? "New here? " : "Have an account? "}
                <button type="button" className="font-medium text-brand-600 hover:underline" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
                  {mode === "signin" ? "Create an account" : "Sign in"}
                </button>
              </p>
            </form>
          )}
          {isDemoMode && <ErrorNote error={error} />}
        </div>
      </section>
    </main>
  );
}

function friendly(e: unknown): string {
  const code = (e as { code?: string }).code ?? "";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) return "Email or password is incorrect.";
  if (code.includes("email-already-in-use")) return "An account with this email already exists.";
  if (code.includes("weak-password")) return "Password must be at least 8 characters.";
  if (code.includes("popup-closed") || code.includes("cancelled-popup")) return "Sign-in was cancelled.";
  if (code.includes("popup-blocked")) return "The browser blocked the Google sign-in popup. Allow popups for this site and try again.";
  if (code.includes("unauthorized-domain")) return `This domain (${window.location.hostname}) is not authorized in Firebase. Add it under Authentication → Settings → Authorized domains.`;
  if (code.includes("operation-not-allowed")) return "This sign-in method is not enabled. Enable it in Firebase → Authentication → Sign-in method.";
  if (code.includes("configuration-not-found")) return "Firebase Authentication is not set up for this project. Open Firebase → Authentication and click Get started.";
  if (code.includes("invalid-api-key") || code.includes("api-key-not-valid")) return "The Firebase API key is invalid. Check NEXT_PUBLIC_FIREBASE_API_KEY and redeploy.";
  if (code.includes("too-many-requests")) return "Too many attempts. Wait a minute and try again.";
  if (code) return `Sign-in failed (${code}).`;
  return e instanceof Error ? e.message : "Sign-in failed.";
}
