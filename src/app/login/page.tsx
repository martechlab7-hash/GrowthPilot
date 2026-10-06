"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Compass } from "lucide-react";
import { product } from "@/config/product";
import { Button, Card, CardBody, ErrorNote, Input, Label } from "@/components/ui";
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
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardBody className="space-y-5 py-8">
          <div className="text-center">
            <Compass className="mx-auto h-8 w-8 text-brand-600" />
            <h1 className="mt-2 text-xl font-semibold">{mode === "signin" ? `Sign in to ${product.name}` : "Create your account"}</h1>
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
        </CardBody>
      </Card>
    </main>
  );
}

function friendly(e: unknown): string {
  const code = (e as { code?: string }).code ?? "";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) return "Email or password is incorrect.";
  if (code.includes("email-already-in-use")) return "An account with this email already exists.";
  if (code.includes("weak-password")) return "Password must be at least 8 characters.";
  if (code.includes("popup-closed")) return "Sign-in was cancelled.";
  return e instanceof Error ? e.message : "Sign-in failed.";
}
