"use client";

import { useState } from "react";
import { Check, EyeOff } from "lucide-react";
import { Card, CardBody, CardHeader, ErrorNote } from "@/components/ui";
import { apiFetch } from "@/lib/client/api";
import { useAuth } from "@/lib/client/auth";
import { cn } from "@/lib/cn";
import { OwlSays, useMascotChoice } from ".";
import { MASCOTS, mascotSheets } from "./registry";

/** Settings → General: choose the character that represents Pilot across the app. */
export function MascotPicker() {
  const { refreshMe } = useAuth();
  const current = useMascotChoice();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selected = pending ?? current;

  const choose = async (id: string) => {
    if (id === current) return;
    setPending(id);
    setError(null);
    try {
      await apiFetch("/api/me", { method: "PATCH", body: { mascot: id } });
      await refreshMe();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(null);
    }
  };

  const name = MASCOTS.find((m) => m.id === selected)?.name;

  return (
    <Card>
      <CardHeader title="Mascot" description="Pick the character that guides you, shows live AI activity and answers case questions. Only affects your account." />
      <CardBody className="space-y-5">
        <div className="min-h-[96px] rounded-2xl bg-gradient-to-br from-brand-50 via-white to-violet-50 px-4 py-3">
          {selected === "none" ? (
            <p className="py-6 text-sm text-muted">Mascot hidden. Pilot still works. You&apos;ll just see text instead of a character.</p>
          ) : (
            <OwlSays size={80} mood={pending ? "sparkle" : null}>
              {pending ? "Settling in…" : <>Hi! I&apos;m Pilot{name ? `, your ${name.toLowerCase()} strategist` : ""}. Click me, I like it.</>}
            </OwlSays>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-7" role="radiogroup" aria-label="Mascot">
          {MASCOTS.map((m) => {
            const active = selected === m.id;
            return (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => void choose(m.id)}
                disabled={!!pending}
                className={cn(
                  "group relative flex flex-col items-center gap-1 rounded-xl border p-2 text-xs transition",
                  active ? "border-brand-500 bg-brand-50 shadow-[0_0_0_3px_rgb(99_102_241/0.15)]" : "border-line hover:border-line-strong hover:bg-canvas",
                )}
              >
                {/* Static thumbnail: the centre cell of the directions sheet. */}
                <span
                  aria-hidden
                  className="block h-14 w-14 transition group-hover:scale-105"
                  style={{ backgroundImage: `url(${mascotSheets(m.id).directions})`, backgroundSize: "300% 300%", backgroundPosition: "50% 50%", backgroundRepeat: "no-repeat" }}
                />
                <span className={cn("font-medium", active ? "text-brand" : "text-muted")}>{m.name}</span>
                {active && <Check className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-brand-600" />}
              </button>
            );
          })}
          <button
            type="button"
            role="radio"
            aria-checked={selected === "none"}
            onClick={() => void choose("none")}
            disabled={!!pending}
            className={cn("flex flex-col items-center justify-center gap-1 rounded-xl border p-2 text-xs transition", selected === "none" ? "border-brand-500 bg-brand-50" : "border-line hover:bg-canvas")}
          >
            <EyeOff className="h-6 w-6 text-subtle" />
            <span className="font-medium text-muted">No mascot</span>
          </button>
        </div>
        <ErrorNote error={error} />
        <p className="text-xs text-muted">Characters from <a className="underline" href="https://github.com/nilbuild/page-mascot" target="_blank" rel="noreferrer">page-mascot</a> by Kamran Ahmed (MIT).</p>
      </CardBody>
    </Card>
  );
}
