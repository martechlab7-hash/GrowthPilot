"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/client/auth";
import { Mascot, type MascotMood } from "./Mascot";
import { DEFAULT_MASCOT, mascotSheets } from "./registry";

export type { MascotMood };

/** The user's chosen mascot (Settings → General); "none" hides it. */
export function useMascotChoice(): string {
  const { me } = useAuth();
  return (me?.onboarded ? me.profile.mascot : undefined) ?? DEFAULT_MASCOT;
}

/** Pilot, rendered as the user's chosen character. */
export function Owl({ size = 72, mood, className, label = "Pilot", character }: { size?: number; mood?: MascotMood | null; className?: string; label?: string; character?: string }) {
  const chosen = useMascotChoice();
  const id = character ?? chosen;
  if (id === "none") return null;
  const sheets = mascotSheets(id);
  // key: remount on change so the new sheets load cleanly
  return <Mascot key={id} directions={sheets.directions} reactions={sheets.reactions} size={size} mood={mood} className={className} label={label} />;
}

/** Owl with a speech bubble — used for guidance and status. */
export function OwlSays({ children, mood, size = 64, tone = "default", className }: { children: ReactNode; mood?: MascotMood | null; size?: number; tone?: "default" | "success" | "error" | "working"; className?: string }) {
  return (
    <div className={cn("flex items-end gap-3", className)}>
      <Owl size={size} mood={mood} />
      <div
        className={cn(
          "relative mb-2 max-w-xl rounded-2xl rounded-bl-sm border px-4 py-2.5 text-sm shadow-sm",
          tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-900",
          tone === "error" && "border-red-200 bg-red-50 text-red-900",
          tone === "working" && "border-indigo-200 bg-indigo-50 text-indigo-950",
          tone === "default" && "border-line bg-white text-ink",
        )}
      >
        {children}
      </div>
    </div>
  );
}
