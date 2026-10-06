"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { BookOpen, Bot, Briefcase, Compass, FileText, Gauge, Layers, LogOut, Palette, Settings } from "lucide-react";
import { product } from "@/config/product";
import { useAuth } from "@/lib/client/auth";
import { isDemoMode } from "@/lib/client/firebase";
import { cn } from "@/lib/cn";
import { Spinner } from "@/components/ui";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  {
    href: "/cases", label: "Cases", icon: Briefcase,
    children: [
      { href: "/cases", label: "All Cases", filter: null },
      { href: "/cases?filter=drafts", label: "Drafts", filter: "drafts" },
      { href: "/cases?filter=completed", label: "Completed", filter: "completed" },
    ],
  },
  { href: "/frameworks", label: "Frameworks", icon: Layers },
  { href: "/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/settings/ai-providers", label: "AI Providers", icon: Bot },
  { href: "/settings/brand", label: "Brand", icon: Palette },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, me, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (me && !me.onboarded) router.replace("/onboarding");
  }, [loading, user, me, router]);

  if (loading || !user || !me?.onboarded) {
    return <div className="flex min-h-screen items-center justify-center"><Spinner label="Loading workspace…" /></div>;
  }

  const isActive = (href: string) => (href === "/settings" ? pathname === "/settings" || pathname === "/settings/usage" : pathname.startsWith(href.split("?")[0]!));

  return (
    <div className="flex min-h-screen">
      <aside className="no-print sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-line bg-white">
        <Link href="/dashboard" className="flex items-center gap-2 px-5 py-5 font-semibold">
          <Compass className="h-5 w-5 text-brand-600" /> {product.name}
        </Link>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
          {NAV.map((item) => (
            <div key={item.href}>
              <Link
                href={item.href}
                className={cn("flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm", isActive(item.href) && !item.children ? "bg-brand-50 font-medium text-brand" : "text-slate-600 hover:bg-canvas")}
              >
                <item.icon className="h-4 w-4" /> {item.label}
              </Link>
              {item.children && (
                <div className="ml-6 border-l border-line pl-2">
                  {item.children.map((c) => {
                    const active = pathname === "/cases" && (params.get("filter") ?? null) === c.filter;
                    return (
                      <Link key={c.href} href={c.href} className={cn("block rounded-md px-3 py-1.5 text-sm", active ? "font-medium text-brand" : "text-slate-500 hover:text-ink")}>
                        {c.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>
        <div className="border-t border-line p-4 text-sm">
          <div className="truncate font-medium">{me.profile.displayName}</div>
          <div className="truncate text-xs text-muted">{me.organization?.name} · {me.profile.role}{isDemoMode ? " · demo" : ""}</div>
          <button onClick={() => signOut().then(() => router.replace("/login"))} className="mt-3 flex items-center gap-1.5 text-xs text-muted hover:text-ink">
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-8 py-8">{children}</main>
    </div>
  );
}
