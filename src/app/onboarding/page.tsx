"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Card, CardBody, ErrorNote, Input, Label } from "@/components/ui";
import { OwlSays } from "@/components/mascot";
import { apiFetch } from "@/lib/client/api";
import { useAuth } from "@/lib/client/auth";
import { looksLikeEmail } from "@/lib/name";

export default function OnboardingPage() {
  const auth = useAuth();
  const router = useRouter();
  const [org, setOrg] = useState("");
  const [name, setName] = useState("");
  const suggested = auth.user && !looksLikeEmail(auth.user.name) ? auth.user.name : "";
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (auth.loading) return;
    if (!auth.user) router.replace("/login");
    else if (auth.me?.onboarded) router.replace("/dashboard");
  }, [auth, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-canvas to-violet-50 px-4">
      <Card className="w-full max-w-md shadow-pop">
        <CardBody className="space-y-4 p-8">
          <OwlSays size={72}>Welcome! Let&apos;s set up your workspace.</OwlSays>
          <h1 className="text-xl font-semibold tracking-tight">Tell us about you</h1>
          <p className="text-sm text-muted">Cases, brand settings and AI providers belong to your organization. You can invite colleagues later.</p>
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError(null);
              try {
                await apiFetch("/api/me", { body: { organizationName: org, displayName: (name || suggested).trim() || undefined } });
                await auth.refreshMe();
                router.replace("/dashboard");
              } catch (err) {
                setError((err as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <div>
              <Label htmlFor="name">Your name</Label>
              <Input id="name" required={!suggested} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder={suggested || "e.g. Naman Sharma"} />
            </div>
            <div>
              <Label htmlFor="org">Organization name</Label>
              <Input id="org" required minLength={2} value={org} onChange={(e) => setOrg(e.target.value)} placeholder="e.g. Acme Consulting" />
            </div>
            <ErrorNote error={error} />
            <Button type="submit" className="w-full" loading={busy}>Continue</Button>
          </form>
        </CardBody>
      </Card>
    </main>
  );
}
