"use client";

import { ChevronDown, Handshake, Mail, Menu, Phone, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/format";
import { AccountButtons } from "./AccountButtons";
import { Logo } from "./Logo";
import { useSite } from "@/components/site/SiteProvider";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function Navbar() {
  const pathname = usePathname();
  const site = useSite();
  const courseMenu = site.navigation.courses;
  const primaryNav = site.navigation.main;
  const [homeLink, ...sectionLinks] = primaryNav;
  const phone = site.contact.phones[0];
  const email = site.contact.emails.general;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [coursesOpen, setCoursesOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const [menuTop, setMenuTop] = useState(72);
  const toggleMobile = () => {
    setMenuTop(headerRef.current?.getBoundingClientRect().bottom ?? 72);
    setMobileOpen((o) => !o);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menus on navigation (state adjustment during render, per React docs)
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMobileOpen(false);
    setCoursesOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
  }, [mobileOpen]);

  useEffect(() => {
    if (!coursesOpen) return;
    const onDown = (e: MouseEvent) => !dropdownRef.current?.contains(e.target as Node) && setCoursesOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setCoursesOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [coursesOpen]);

  const coursesActive = courseMenu.some((l) => isActive(pathname, l.href));
  const linkCls = (active: boolean) =>
    cn(
      "relative rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:text-navy-900",
      active ? "text-navy-900 after:absolute after:inset-x-3 after:-bottom-[13px] after:h-0.5 after:rounded-full after:bg-brand-600" : "text-slate-600",
    );

  return (
    <>
      {/* Utility bar */}
      <div className="island hidden bg-navy-950 text-navy-200 md:block">
        <div className="container-page flex h-9 items-center justify-between text-xs">
          <p className="flex items-center gap-2">
            <ShieldCheck className="size-3.5 text-verify-500" aria-hidden />
            {site.announcement}
          </p>
          <div className="flex items-center gap-5">
            <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-1.5 hover:text-white">
              <Phone className="size-3.5" aria-hidden /> {phone}
            </a>
            <a href={`mailto:${email}`} className="flex items-center gap-1.5 hover:text-white">
              <Mail className="size-3.5" aria-hidden /> {email}
            </a>
            <Link href="/become-a-partner" className="flex items-center gap-1.5 font-semibold text-white hover:text-brand-200">
              <Handshake className="size-3.5" aria-hidden /> Become a Partner
            </Link>
          </div>
        </div>
      </div>

      <header ref={headerRef} className={cn("site-header sticky top-0 z-50 border-b bg-white/90 backdrop-blur-lg transition-shadow", scrolled ? "border-line shadow-(--shadow-card)" : "border-transparent")}>
        <div className="container-page flex h-[72px] items-center justify-between gap-4">
          <Logo />

          <nav aria-label="Main" className="hidden items-center gap-0.5 lg:flex">
            {homeLink && (
              <Link href={homeLink.href} className={cn(linkCls(pathname === homeLink.href), "hidden xl:block")}>
                {homeLink.shortLabel ?? homeLink.label}
              </Link>
            )}
            <div ref={dropdownRef} className="relative">
              <button
                className={cn(linkCls(coursesActive), "flex items-center gap-1")}
                aria-expanded={coursesOpen}
                aria-controls="courses-menu"
                onClick={() => setCoursesOpen((o) => !o)}
              >
                Courses
                <ChevronDown className={cn("size-4 transition-transform", coursesOpen && "rotate-180")} aria-hidden />
              </button>
              <div
                id="courses-menu"
                hidden={!coursesOpen}
                className="absolute left-1/2 top-full mt-3 w-80 -translate-x-1/2 animate-fade-up rounded-2xl border border-line bg-white p-2 shadow-(--shadow-lift)"
              >
                {courseMenu.map((l) => (
                  <Link key={l.href} href={l.href} className="block rounded-xl px-4 py-3 transition-colors hover:bg-surface">
                    <span className="block text-sm font-semibold text-navy-900">{l.label}</span>
                    <span className="block text-xs text-muted">{l.description}</span>
                  </Link>
                ))}
              </div>
            </div>
            {sectionLinks.slice(0, 1).map((l) => (
              <Link key={l.href} href={l.href} className={linkCls(isActive(pathname, l.href))}>
                {l.shortLabel ?? l.label}
              </Link>
            ))}
            <Link
              href="/verify-certificate"
              className={cn(linkCls(isActive(pathname, "/verify-certificate")), "flex items-center gap-1.5 text-verify-700! hover:text-verify-800!")}
            >
              <ShieldCheck className="size-4" aria-hidden />
              Verify Certificate
            </Link>
            {sectionLinks.slice(1).map((l) => (
              <Link key={l.href} href={l.href} className={linkCls(isActive(pathname, l.href))}>
                {l.shortLabel ?? l.label}
              </Link>
            ))}
          </nav>

          <div className="hidden lg:block">
            <AccountButtons />
          </div>

          <button
            className="-mr-2 rounded-lg p-2 text-navy-900 hover:bg-navy-50 lg:hidden"
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={toggleMobile}
          >
            {mobileOpen ? <X className="size-6" aria-hidden /> : <Menu className="size-6" aria-hidden />}
          </button>
        </div>

      </header>

      {/* Mobile menu — kept outside <header>: its backdrop-filter would contain fixed children */}
      <div
        id="mobile-menu"
        hidden={!mobileOpen}
        style={{ top: menuTop }}
        className="fixed inset-x-0 bottom-0 z-40 overflow-y-auto bg-white lg:hidden"
      >
        <nav aria-label="Mobile" className="container-page flex flex-col gap-6 py-6">
          <Link
            href="/verify-certificate"
            className="flex items-center gap-3 rounded-2xl bg-verify-50 p-4 ring-1 ring-verify-100"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-verify-600 text-white">
              <ShieldCheck className="size-5" aria-hidden />
            </span>
            <span>
              <span className="block font-semibold text-verify-800">Verify a Certificate</span>
              <span className="block text-xs text-verify-700">Check authenticity in seconds</span>
            </span>
          </Link>

          <div>
            <p className="eyebrow mb-2 text-muted!">Learn</p>
            <ul className="divide-y divide-line border-y border-line">
              {courseMenu.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={cn("flex py-3.5 text-base font-medium", isActive(pathname, l.href) ? "text-brand-700" : "text-navy-900")}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="eyebrow mb-2 text-muted!">NYTI</p>
            <ul className="divide-y divide-line border-y border-line">
              {[...primaryNav, { label: "Become a Partner", href: "/become-a-partner" }].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={cn("flex py-3.5 text-base font-medium", isActive(pathname, l.href) ? "text-brand-700" : "text-navy-900")}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <AccountButtons size="md" stacked />
        </nav>
      </div>
    </>
  );
}
