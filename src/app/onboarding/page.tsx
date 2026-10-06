"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Card, CardBody, ErrorNote, Input, Label } from "@/components/ui";
import { apiFetch } from "@/lib/client/api";
import { useAuth } from "@/lib/client/auth";

export default function OnboardingPage() {
  const auth = useAuth();
  const router = useRouter();
  const [org, setOrg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (auth.loading) return;
    if (!auth.user) router.replace("/login");
    else if (auth.me?.onboarded) router.replace("/dashboard");
  }, [auth, router]);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardBody className="space-y-4 py-8">
          <h1 className="text-xl font-semibold">Set up your workspace</h1>
          <p className="text-sm text-muted">Cases, brand settings and AI providers belong to your organization. You can invite colleagues later.</p>
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError(null);
              try {
                await apiFetch("/api/me", { body: { organizationName: org } });
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
