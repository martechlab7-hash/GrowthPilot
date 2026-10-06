"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { BookOpen, Briefcase, ChevronRight, Compass, FileText, Gauge, Layers, LogOut, Menu, Plus, Settings, X } from "lucide-react";
import { product } from "@/config/product";
import { useAuth } from "@/lib/client/auth";
import { isDemoMode } from "@/lib/client/firebase";
import { cn } from "@/lib/cn";
import { Spinner } from "@/components/ui";
import { Owl } from "@/components/mascot";

const NAV: { title: string; items: { href: string; label: string; icon: typeof Gauge; match?: (p: string) => boolean }[] }[] = [
  {
    title: "Workspace",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: Gauge },
      { href: "/cases", label: "Cases", icon: Briefcase, match: (p) => p.startsWith("/cases") },
      { href: "/reports", label: "Reports", icon: FileText },
    ],
  },
  {
    title: "Library",
    items: [
      { href: "/frameworks", label: "Frameworks", icon: Layers },
      { href: "/knowledge", label: "Knowledge", icon: BookOpen },
    ],
  },
];

const CASE_FILTERS = [
  { href: "/cases", label: "All cases", filter: null },
  { href: "/cases?filter=active", label: "Active", filter: "active" },
  { href: "/cases?filter=drafts", label: "Drafts", filter: "drafts" },
  { href: "/cases?filter=completed", label: "Completed", filter: "completed" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, me, meError, loading, signOut, refreshMe } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (me && !me.onboarded) router.replace("/onboarding");
  }, [loading, user, me, router]);

  // Close the mobile drawer on navigation.
  useEffect(() => {
    const id = setTimeout(() => setMobileOpen(false), 0);
    return () => clearTimeout(id);
  }, [pathname]);

  if (!loading && user && !me && meError) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div role="alert" className="max-w-md space-y-3 rounded-2xl border border-red-200 bg-white p-6 text-sm shadow-card">
          <Owl size={64} mood="surprised" />
          <p className="font-semibold text-red-700">Signed in as {user.email}, but your account could not be loaded.</p>
          <p className="text-slate-700">{meError}</p>
          <div className="flex gap-3">
            <button className="font-medium text-brand-600 underline" onClick={() => void refreshMe()}>Retry</button>
            <button className="font-medium text-brand-600 underline" onClick={() => signOut().then(() => router.replace("/login"))}>Sign out</button>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !user || !me?.onboarded) {
    return <div className="flex min-h-screen items-center justify-center"><Spinner label="Loading workspace…" /></div>;
  }

  const initials = me.profile.displayName.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar text-slate-300">
      <Link href="/dashboard" className="flex items-center gap-2.5 px-5 pb-4 pt-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-violet-500 text-white shadow-lg shadow-brand-600/30">
          <Compass className="h-4.5 w-4.5" />
        </span>
        <span className="text-[15px] font-semibold tracking-tight text-white">{product.name}</span>
      </Link>

      <div className="px-3 pb-3">
        <Link href="/cases/new" className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-white/10 text-sm font-medium text-white ring-1 ring-white/10 transition hover:bg-white/15">
          <Plus className="h-4 w-4" /> New case
        </Link>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2">
        {NAV.map((group) => (
          <div key={group.title}>
            <div className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{group.title}</div>
            {group.items.map((item) => {
              const active = item.match ? item.match(pathname) : pathname.startsWith(item.href);
              return (
                <div key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition",
                      active ? "bg-white/10 font-medium text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-100",
                    )}
                  >
                    <item.icon className={cn("h-4 w-4", active ? "text-brand-100" : "text-slate-500 group-hover:text-slate-300")} />
                    {item.label}
                  </Link>
                  {item.href === "/cases" && pathname === "/cases" && (
                    <div className="ml-5 mt-1 space-y-0.5 border-l border-white/10 pl-3">
                      {CASE_FILTERS.map((f) => {
                        const on = (params.get("filter") ?? null) === f.filter;
                        return (
                          <Link key={f.href} href={f.href} className={cn("block rounded-md px-2 py-1 text-[13px]", on ? "text-white" : "text-slate-500 hover:text-slate-200")}>
                            {f.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="space-y-1 border-t border-white/10 p-3">
        <Link
          href="/settings"
          className={cn("flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition", pathname.startsWith("/settings") ? "bg-white/10 font-medium text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-100")}
        >
          <Settings className="h-4 w-4" /> Settings
        </Link>
        <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-600 to-slate-700 text-xs font-semibold text-white">{initials || "?"}</span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-white">{me.profile.displayName}</div>
            <div className="truncate text-xs text-slate-500">{me.organization?.name} · {me.profile.role}{isDemoMode ? " · demo" : ""}</div>
          </div>
          <button aria-label="Sign out" title="Sign out" onClick={() => signOut().then(() => router.replace("/login"))} className="rounded-md p-1.5 text-slate-500 hover:bg-white/10 hover:text-white">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="no-print sticky top-0 hidden h-screen w-64 shrink-0 lg:block">{sidebar}</aside>

      {mobileOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 animate-slide-up shadow-pop">{sidebar}</aside>
          <button aria-label="Close menu" onClick={() => setMobileOpen(false)} className="absolute left-[19rem] top-4 rounded-full bg-white p-2 shadow-pop"><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-white/80 px-4 backdrop-blur-md sm:px-8">
          <button aria-label="Open menu" onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-muted hover:bg-canvas lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <Breadcrumbs pathname={pathname} />
          <div className="ml-auto flex items-center gap-2">
            <Link href="/cases/new" className="hidden h-8 items-center gap-1.5 rounded-lg bg-ink px-3 text-[13px] font-medium text-white transition hover:bg-ink/85 sm:flex">
              <Plus className="h-3.5 w-3.5" /> New case
            </Link>
          </div>
        </header>
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}

const LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  cases: "Cases",
  new: "New case",
  reports: "Reports",
  frameworks: "Frameworks",
  knowledge: "Knowledge",
  settings: "Settings",
  "ai-providers": "AI providers",
  brand: "Brand",
  usage: "AI usage",
};

function Breadcrumbs({ pathname }: { pathname: string }) {
  const parts = pathname.split("/").filter(Boolean);
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm">
      {parts.map((p, i) => {
        const href = "/" + parts.slice(0, i + 1).join("/");
        const label = LABELS[p] ?? (p.startsWith("case_") ? "Case" : p);
        const last = i === parts.length - 1;
        return (
          <span key={href} className="flex min-w-0 items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-subtle" />}
            {last ? <span className="truncate font-medium text-ink">{label}</span> : <Link href={href} className="truncate text-muted hover:text-ink">{label}</Link>}
          </span>
        );
      })}
    </nav>
  );
}
