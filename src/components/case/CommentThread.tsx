"use client";

import { useState } from "react";
import { MessageSquare, Trash2 } from "lucide-react";
import type { Case } from "@/domain/types";
import { Button, Textarea } from "@/components/ui";
import { useAuth } from "@/lib/client/auth";
import { timeAgo } from "@/lib/labels";
import type { CaseTabProps } from "./Workspace";

type Comment = NonNullable<Case["comments"]>[number];

/** Team discussion attached to a hypothesis or recommendation. */
export function CommentThread({ target, targetId, comments, ctl }: { target: Comment["target"]; targetId: string; comments: Comment[]; ctl: CaseTabProps["ctl"] }) {
  const { me } = useAuth();
  const uid = me?.onboarded ? me.profile.id : "";
  const canModerate = me?.onboarded && ["owner", "admin", "strategist"].includes(me.profile.role);
  const mine = comments.filter((c) => c.target === target && c.targetId === targetId);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const label = `Comment ${targetId}`;

  return (
    <div className="text-sm">
      <button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink">
        <MessageSquare className="h-3.5 w-3.5" /> {mine.length ? `${mine.length} comment${mine.length > 1 ? "s" : ""}` : "Discuss with your team"}
      </button>
      {open && (
        <div className="mt-2 space-y-2 rounded-xl border border-line bg-canvas/50 p-3">
          {mine.map((c) => (
            <div key={c.id} className="flex items-start gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-semibold text-brand-700">{c.byName.slice(0, 2).toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <div className="text-xs"><span className="font-semibold">{c.byName}</span> <span className="text-subtle">· {timeAgo(c.at)}</span></div>
                <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{c.text}</p>
              </div>
              {(c.by === uid || canModerate) && (
                <button aria-label="Delete comment" onClick={() => void ctl.run(`Delete ${c.id}`, `/comments/${c.id}`, { method: "DELETE" })} className="rounded p-1 text-subtle hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
              )}
            </div>
          ))}
          <div className="flex items-end gap-2">
            <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a comment for your team…" aria-label="Comment" />
            <Button size="sm" loading={ctl.busy === label} disabled={!text.trim()} onClick={async () => {
              if (await ctl.run(label, "/comments", { body: { target, targetId, text: text.trim() } })) setText("");
            }}>Post</Button>
          </div>
        </div>
      )}
    </div>
  );
}
