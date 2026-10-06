"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { BookOpen, Briefcase, ChevronRight, ChevronsUpDown, Compass, FileText, Gauge, Layers, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Plus, Settings, X } from "lucide-react";
import { product } from "@/config/product";
import { useAuth } from "@/lib/client/auth";
import { isDemoMode } from "@/lib/client/firebase";
import { cn } from "@/lib/cn";
import { Spinner } from "@/components/ui";
import { Owl } from "@/components/mascot";
import { friendlyName, initials as nameInitials } from "@/lib/name";

const COLLAPSE_KEY = "gp.sidebar.collapsed";

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
      { href: "/settings", label: "Settings", icon: Settings },
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
  // The shell only renders after auth resolves on the client, so reading
  // localStorage in the initializer cannot cause a hydration mismatch.
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return typeof window !== "undefined" && window.localStorage.getItem(COLLAPSE_KEY) === "1"; } catch { return false; }
  });
  const toggleCollapsed = () => {
    setCollapsed((v) => {
      try { window.localStorage.setItem(COLLAPSE_KEY, v ? "0" : "1"); } catch { /* storage unavailable */ }
      return !v;
    });
  };

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

  const name = friendlyName(me.profile.displayName);
  const doSignOut = () => signOut().then(() => router.replace("/login"));

  const sidebar = (mini: boolean) => (
    <div className="flex h-full flex-col bg-sidebar text-slate-300">
      <div className={cn("flex items-center pb-4 pt-5", mini ? "flex-col gap-3 px-2" : "gap-2.5 px-5")}>
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5" title={product.name}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-violet-500 text-white shadow-lg shadow-brand-600/30">
            <Compass className="h-4.5 w-4.5" />
          </span>
          {!mini && <span className="truncate text-[15px] font-semibold tracking-tight text-white">{product.name}</span>}
        </Link>
        <button
          aria-label={mini ? "Expand sidebar" : "Collapse sidebar"}
          title={mini ? "Expand sidebar" : "Collapse sidebar"}
          onClick={toggleCollapsed}
          className={cn("hidden rounded-md p-1.5 text-slate-500 transition hover:bg-white/10 hover:text-white lg:block", !mini && "ml-auto")}
        >
          {mini ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      <div className={cn("pb-3", mini ? "px-2" : "px-3")}>
        <Link href="/cases/new" title="New case" className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-white/10 text-sm font-medium text-white ring-1 ring-white/10 transition hover:bg-white/15">
          <Plus className="h-4 w-4" /> {!mini && "New case"}
        </Link>
      </div>

      <nav className={cn("flex-1 space-y-5 overflow-y-auto py-2", mini ? "px-2" : "px-3")}>
        {NAV.map((group) => (
          <div key={group.title}>
            {mini ? <div className="mx-2 mb-2 border-t border-white/10" /> : <div className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{group.title}</div>}
            {group.items.map((item) => {
              const active = item.match ? item.match(pathname) : pathname.startsWith(item.href);
              return (
                <div key={item.href}>
                  <Link
                    href={item.href}
                    title={mini ? item.label : undefined}
                    aria-label={mini ? item.label : undefined}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-lg py-2 text-sm transition",
                      mini ? "justify-center px-0" : "px-3",
                      active ? "bg-white/10 font-medium text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-100",
                    )}
                  >
                    <item.icon className={cn("h-4 w-4 shrink-0", active ? "text-brand-100" : "text-slate-500 group-hover:text-slate-300")} />
                    {!mini && item.label}
                  </Link>
                  {!mini && item.href === "/cases" && pathname === "/cases" && (
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

      <div className={cn("border-t border-white/10", mini ? "p-2" : "p-3")}>
        <UserMenu
          mini={mini}
          name={name}
          initials={nameInitials(me.profile.displayName)}
          email={me.profile.email}
          org={me.organization?.name ?? ""}
          role={`${me.profile.role}${isDemoMode ? " · demo" : ""}`}
          onSignOut={doSignOut}
        />
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <aside className={cn("no-print sticky top-0 hidden h-screen shrink-0 transition-[width] duration-200 lg:block", collapsed ? "w-[68px]" : "w-64")}>{sidebar(collapsed)}</aside>

      {mobileOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 animate-slide-up shadow-pop">{sidebar(false)}</aside>
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

function UserMenu({ mini, name, initials, email, org, role, onSignOut }: { mini: boolean; name: string; initials: string; email: string; org: string; role: string; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const avatar = <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-xs font-semibold text-white">{initials}</span>;
  return (
    <div ref={ref} className="relative">
      <button
        aria-label="Account menu"
        aria-expanded={open}
        title={mini ? name : undefined}
        onClick={() => setOpen((v) => !v)}
        className={cn("flex w-full items-center gap-2.5 rounded-xl py-1.5 text-left transition hover:bg-white/5", mini ? "justify-center px-0" : "px-2")}
      >
        {avatar}
        {!mini && (
          <>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">{name}</span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-500" />
          </>
        )}
      </button>
      {open && (
        <div role="menu" className={cn("absolute bottom-full z-50 mb-2 w-60 animate-fade-in rounded-xl border border-line bg-white p-1.5 text-sm text-ink shadow-pop", mini ? "left-0" : "inset-x-0 w-auto")}>
          <div className="flex items-center gap-2.5 px-2.5 py-2">
            {avatar}
            <div className="min-w-0">
              <div className="truncate font-medium">{name}</div>
              <div className="truncate text-xs text-muted">{email}</div>
            </div>
          </div>
          <div className="mx-2.5 mb-1.5 truncate rounded-md bg-canvas px-2 py-1 text-xs text-muted">{org} · <span className="capitalize">{role}</span></div>
          <div className="border-t border-line pt-1">
            <Link role="menuitem" href="/settings" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-canvas"><Settings className="h-4 w-4 text-muted" /> Settings</Link>
            <button role="menuitem" onClick={onSignOut} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-red-600 hover:bg-red-50"><LogOut className="h-4 w-4" /> Sign out</button>
          </div>
        </div>
      )}
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
