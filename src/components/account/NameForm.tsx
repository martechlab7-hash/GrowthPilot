"use client";

import { useState } from "react";
import { Button, ErrorNote, Input } from "@/components/ui";
import { apiFetch } from "@/lib/client/api";
import { useAuth } from "@/lib/client/auth";
import { looksLikeEmail } from "@/lib/name";

/** Inline "what should we call you?" form; saves the display name via PATCH /api/me. */
export function NameForm({ submitLabel = "Save", onSaved, autoFocus }: { submitLabel?: string; onSaved?: () => void; autoFocus?: boolean }) {
  const { me, refreshMe } = useAuth();
  const current = me?.onboarded ? me.profile.displayName : "";
  const [name, setName] = useState(looksLikeEmail(current) ? "" : current);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = name.trim();

  return (
    <form
      className="space-y-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!trimmed || looksLikeEmail(trimmed)) return setError("Please enter your name, not an email address.");
        setBusy(true);
        setError(null);
        try {
          await apiFetch("/api/me", { method: "PATCH", body: { displayName: trimmed } });
          await refreshMe();
          onSaved?.();
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="flex flex-wrap gap-2">
        <Input aria-label="Your name" autoFocus={autoFocus} className="max-w-xs" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Naman Sharma" />
        <Button type="submit" loading={busy} disabled={!trimmed || trimmed === current}>{submitLabel}</Button>
      </div>
      <ErrorNote error={error} />
    </form>
  );
}
