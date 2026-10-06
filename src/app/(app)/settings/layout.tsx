"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BarChart3, Bot, Palette, UserCog } from "lucide-react";
import { useAuth } from "@/lib/client/auth";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/settings", label: "General", icon: UserCog, exact: true },
  { href: "/settings/ai-providers", label: "AI providers", icon: Bot },
  { href: "/settings/brand", label: "Brand", icon: Palette },
  { href: "/settings/usage", label: "AI usage", icon: BarChart3, admin: true },
];

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { me } = useAuth();
  const isAdmin = me?.onboarded && ["owner", "admin"].includes(me.profile.role);
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <div className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-brand-600">Settings</div>
        <h1 className="text-[26px] font-semibold tracking-tight">Workspace settings</h1>
        <p className="mt-1 text-sm text-muted">Account, AI providers, brand guidelines and usage for {me?.onboarded ? me.organization?.name : "your organization"}.</p>
      </div>
      <nav className="no-print mb-6 flex gap-1 overflow-x-auto border-b border-line" aria-label="Settings sections">
        {TABS.filter((t) => !t.admin || isAdmin).map((t) => {
          const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition",
                active ? "border-brand-600 font-medium text-ink" : "border-transparent text-muted hover:text-ink",
              )}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
