"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, CardBody, CardHeader, ErrorNote, Input } from "@/components/ui";
import { apiFetch } from "@/lib/client/api";
import { useAuth } from "@/lib/client/auth";

export default function SettingsPage() {
  const { me, signOut } = useAuth();
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!me?.onboarded) return null;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Account & organization" />
        <CardBody className="grid gap-3 text-sm sm:grid-cols-2">
          <div><div className="text-muted">Name</div>{me.profile.displayName}</div>
          <div><div className="text-muted">Email</div>{me.profile.email}</div>
          <div><div className="text-muted">Organization</div>{me.organization?.name}</div>
          <div><div className="text-muted">Role · Plan</div>{me.profile.role} · {me.organization?.plan}</div>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Privacy" description="Cases and their history can be exported or deleted from each case's History tab. Deleting your account removes your profile; if you are the only member, all organization data is deleted." />
        <CardBody className="space-y-3">
          <div className="flex gap-2">
            <Input className="max-w-xs" placeholder='Type "DELETE" to confirm' value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
            <Button variant="danger" disabled={confirmText !== "DELETE"} loading={busy} onClick={async () => {
              setBusy(true); setErr(null);
              try { await apiFetch("/api/me", { method: "DELETE", body: { confirm: confirmText } }); await signOut(); router.replace("/"); } catch (e) { setErr((e as Error).message); setBusy(false); }
            }}>Delete account</Button>
          </div>
          <ErrorNote error={err} />
        </CardBody>
      </Card>
    </div>
  );
}
