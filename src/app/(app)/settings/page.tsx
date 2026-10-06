"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, CardBody, CardHeader, ErrorNote, Input, PageHeader } from "@/components/ui";
import { apiFetch } from "@/lib/client/api";
import { useAuth } from "@/lib/client/auth";

export default function SettingsPage() {
  const { me, signOut } = useAuth();
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!me?.onboarded) return null;
  const isAdmin = ["owner", "admin"].includes(me.profile.role);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Settings" />
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
        <CardHeader title="Workspace" />
        <CardBody className="flex flex-wrap gap-2">
          <Link href="/settings/ai-providers"><Button variant="outline">AI providers</Button></Link>
          <Link href="/settings/brand"><Button variant="outline">Brand guidelines</Button></Link>
          {isAdmin && <Link href="/settings/usage"><Button variant="outline">AI usage & cost</Button></Link>}
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
