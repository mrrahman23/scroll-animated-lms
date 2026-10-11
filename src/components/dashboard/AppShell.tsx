"use client";

import {
  Award, Bell, BookOpen, Building2, ChartColumn, ClipboardCheck, ClipboardList, Compass, CreditCard, FileText, GraduationCap,
  LayoutDashboard, LogOut, Menu, PlayCircle, Search, Settings, ShieldCheck, TrendingUp, User, Users, X, type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/layout/Logo";
import { logout } from "@/lib/auth/actions";
import { Avatar } from "@/components/ui/primitives";
import { cn } from "@/lib/format";
import { portals, type NavIcon, type PortalNavItem } from "./portals";
import type { UserRole } from "@/types";

const icons: Record<NavIcon, LucideIcon> = {
  dashboard: LayoutDashboard, courses: BookOpen, browse: Compass, progress: TrendingUp, assignments: ClipboardList,
  assessments: ClipboardCheck, certificates: Award, payments: CreditCard, notifications: Bell, profile: User,
  settings: Settings, users: Users, partners: Building2, verify: ShieldCheck, reports: ChartColumn, content: FileText,
  students: GraduationCap, lessons: PlayCircle,
};

function NavList({ items, pathname, home, badges = {} }: { items: PortalNavItem[]; pathname: string; home: string; badges?: Badges }) {
  const matches = (href: string) => (href === home ? pathname === home : pathname === href || pathname.startsWith(`${href}/`));
  // The most specific link wins (e.g. Courses over Website on /admin/content/courses)
  const current = items.filter((i) => matches(i.href)).sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <ul className="space-y-0.5">
      {items.map((item) => {
        const Icon = icons[item.icon];
        const active = item.href === current;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-white/10 text-white" : "text-navy-200 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className={cn("size-[18px]", active ? "text-brand-300" : "text-navy-400")} aria-hidden />
              <span className="flex-1">{item.label}</span>
              {badges[item.href] && <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-white">{badges[item.href]}</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Sidebar badge text keyed by nav href (computed from data on the server). */
export type Badges = Record<string, string | undefined>;

export function AppShell({
  role,
  userName,
  badges,
  demo = false,
  children,
}: {
  role: UserRole;
  userName: string;
  badges?: Badges;
  /** Demo mode (no database): shows the portal switcher instead of a real sign-out. */
  demo?: boolean;
  children: React.ReactNode;
}) {
  const cfg = portals[role];
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  const sidebar = (
    <div className="island guilloche flex h-full flex-col bg-navy-950 px-4 py-6">
      <div className="px-2"><Logo inverse compact /></div>
      <p className="mt-6 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-navy-400">{cfg.title} portal</p>
      <nav aria-label={`${cfg.title} navigation`} className="mt-3 flex flex-1 flex-col justify-between overflow-y-auto">
        <NavList items={cfg.nav} pathname={pathname} home={cfg.home} badges={badges} />
        <div className="mt-6 border-t border-white/10 pt-4">
          <NavList items={cfg.secondary} pathname={pathname} home={cfg.home} />
          {demo ? (
            <Link href="/" className="mt-0.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-navy-200 hover:bg-white/5 hover:text-white">
              <LogOut className="size-[18px] text-navy-400" aria-hidden /> Exit demo
            </Link>
          ) : (
            <form action={logout}>
              <button type="submit" className="mt-0.5 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-navy-200 hover:bg-white/5 hover:text-white">
                <LogOut className="size-[18px] text-navy-400" aria-hidden /> Log out
              </button>
            </form>
          )}
        </div>
      </nav>
      {demo && (
      <div className="mt-4 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
        <p className="text-xs font-semibold text-white">Switch portal (demo)</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {Object.values(portals).map((p) => (
            <Link key={p.role} href={p.home} className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize", p.role === role ? "bg-white text-navy-900" : "bg-white/10 text-navy-100 hover:bg-white/20")}>
              {p.role}
            </Link>
          ))}
        </div>
      </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-surface lg:pl-72">
      <aside className="fixed inset-y-0 left-0 hidden w-72 lg:block">{sidebar}</aside>

      {/* Mobile drawer */}
      <div hidden={!open} className="fixed inset-0 z-50 lg:hidden">
        <button className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" aria-label="Close navigation" onClick={() => setOpen(false)} />
        <div className="relative h-full w-[min(20rem,85vw)] animate-fade-up">{sidebar}</div>
        <button onClick={() => setOpen(false)} className="absolute right-4 top-4 rounded-lg bg-white/10 p-2 text-white" aria-label="Close navigation">
          <X className="size-5" aria-hidden />
        </button>
      </div>

      <header className="site-header sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur-lg">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button className="-ml-2 rounded-lg p-2 text-navy-900 hover:bg-navy-50 lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation" aria-expanded={open}>
            <Menu className="size-6" aria-hidden />
          </button>
          <div className="relative hidden max-w-md flex-1 sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-navy-400" aria-hidden />
            <input type="search" aria-label="Search" placeholder={role === "admin" ? "Search users, courses, certificate IDs…" : "Search your courses…"} className="h-10 w-full rounded-xl border border-line bg-surface pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/verify-certificate" className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-verify-700 hover:bg-verify-50 md:flex">
              <ShieldCheck className="size-4" aria-hidden /> Verify
            </Link>
            <Link href={role === "student" ? "/dashboard/notifications" : cfg.home} className="relative rounded-lg p-2 text-navy-700 hover:bg-navy-50" aria-label="Notifications">
              <Bell className="size-5" aria-hidden />
              {Object.values(badges ?? {}).some(Boolean) && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-red-500 ring-2 ring-white" />}
            </Link>
            <div className="flex items-center gap-3 border-l border-line pl-3">
              <Avatar name={userName} size="sm" />
              <div className="hidden leading-tight sm:block">
                <p className="text-sm font-semibold text-navy-900">{userName}</p>
                <p className="text-xs capitalize text-muted">{cfg.title}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main id="main" className="px-4 py-8 sm:px-6 lg:px-8 lg:py-10">{children}</main>
    </div>
  );
}
