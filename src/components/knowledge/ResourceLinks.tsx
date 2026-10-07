"use client";

import { useState } from "react";
import { ExternalLink, Link2, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, CardBody, CardHeader, ErrorNote, Input, Label, Skeleton, Textarea } from "@/components/ui";
import { apiFetch } from "@/lib/client/api";
import { useAuth } from "@/lib/client/auth";
import { useApi } from "@/lib/client/useApi";

interface Resource {
  id: string;
  title: string;
  url: string;
  notes?: string;
  tags: string[];
  createdBy: string;
  createdAt: string;
}

const CONTRIBUTORS = ["owner", "admin", "strategist", "analyst"];
const MANAGERS = ["owner", "admin", "strategist"];

/** Organization knowledge base: reference links people add for the AI agents and the team. */
export function ResourceLinks() {
  const { me } = useAuth();
  const role = me?.onboarded ? me.profile.role : "viewer";
  const uid = me?.onboarded ? me.profile.id : "";
  const { data, error, loading, setData } = useApi<{ resources: Resource[] }>("/api/knowledge/resources");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", url: "", notes: "", tags: "" });
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const resources = data?.resources ?? [];
  const f = filter.trim().toLowerCase();
  const shown = resources.filter((r) => !f || [r.title, r.url, r.notes ?? "", ...r.tags].some((x) => x.toLowerCase().includes(f)));

  const submit = async () => {
    setBusy(true);
    setFormError(null);
    try {
      const url = /^https?:\/\//i.test(form.url.trim()) ? form.url.trim() : `https://${form.url.trim()}`;
      const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
      const { resource } = await apiFetch<{ resource: Resource }>("/api/knowledge/resources", {
        body: { title: form.title, url, ...(form.notes.trim() ? { notes: form.notes } : {}), ...(tags.length ? { tags } : {}) },
      });
      setData({ resources: [resource, ...resources] });
      setForm({ title: "", url: "", notes: "", tags: "" });
      setOpen(false);
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await apiFetch(`/api/knowledge/resources/${id}`, { method: "DELETE" });
      setData({ resources: resources.filter((r) => r.id !== id) });
    } catch (e) {
      setFormError((e as Error).message);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Resource links"
        description="Playbooks, research, brand guidelines, dashboards or articles your team relies on. The AI agents see each link's title and notes as reference context (pages are not fetched)."
        action={CONTRIBUTORS.includes(role) && !open ? <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add link</Button> : undefined}
      />
      <CardBody className="space-y-4">
        {open && (
          <form
            className="grid gap-3 rounded-xl border border-line bg-canvas p-4 sm:grid-cols-2"
            onSubmit={(e) => { e.preventDefault(); void submit(); }}
          >
            <div>
              <Label htmlFor="res-title">Title</Label>
              <Input id="res-title" required minLength={2} maxLength={140} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Retention playbook 2026" />
            </div>
            <div>
              <Label htmlFor="res-url">URL</Label>
              <Input id="res-url" required value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://…" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="res-notes">What is it / when should it be used? (optional)</Label>
              <Textarea id="res-notes" rows={2} maxLength={1000} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. Our approved win-back offer ladder and discount guardrails" />
            </div>
            <div>
              <Label htmlFor="res-tags">Tags (comma separated, optional)</Label>
              <Input id="res-tags" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="retention, crm, braze" />
            </div>
            <div className="flex items-end justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => { setOpen(false); setFormError(null); }}>Cancel</Button>
              <Button type="submit" loading={busy}>Save link</Button>
            </div>
            <div className="sm:col-span-2"><ErrorNote error={formError} /></div>
          </form>
        )}
        {!open && <ErrorNote error={formError ?? error} />}

        {loading ? (
          <Skeleton className="h-16" />
        ) : resources.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-line px-4 py-6 text-sm text-muted">
            <Link2 className="h-5 w-5 shrink-0" /> No links yet. Add your team&apos;s playbooks, research and dashboards so every case can reference them.
          </div>
        ) : (
          <>
            {resources.length > 5 && <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter links" aria-label="Filter links" className="max-w-xs" />}
            <ul className="divide-y divide-line">
              {shown.map((r) => (
                <li key={r.id} className="flex items-start gap-3 py-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><Link2 className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <a href={r.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 font-medium hover:text-brand-600">
                      {r.title} <ExternalLink className="h-3.5 w-3.5 text-subtle" />
                    </a>
                    <div className="truncate text-xs text-subtle">{r.url}</div>
                    {r.notes && <p className="mt-1 text-sm text-muted">{r.notes}</p>}
                    {r.tags.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1">{r.tags.map((t) => <Badge key={t}>{t}</Badge>)}</div>}
                  </div>
                  {(r.createdBy === uid || MANAGERS.includes(role)) && (
                    <button aria-label={`Remove ${r.title}`} title="Remove" onClick={() => void remove(r.id)} className="rounded-md p-1.5 text-subtle hover:bg-red-50 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </CardBody>
    </Card>
  );
}
