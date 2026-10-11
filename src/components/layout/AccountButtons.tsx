"use client";

import { LayoutDashboard, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { ButtonLink, buttonClasses } from "@/components/ui/Button";
import { logout } from "@/lib/auth/actions";
import { cn } from "@/lib/format";

type Me = { signedIn: false } | { signedIn: true; name: string; role: string; home: string };

/**
 * Login/Register, or Dashboard/Log out when signed in. Loaded in the browser so public
 * pages stay static and cacheable.
 */
export function AccountButtons({ size = "sm", stacked }: { size?: "sm" | "md"; stacked?: boolean }) {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    let live = true;
    fetch("/api/me")
      .then((r) => r.json())
      .then((m: Me) => live && setMe(m))
      .catch(() => live && setMe({ signedIn: false }));
    return () => {
      live = false;
    };
  }, []);

  const wrap = cn(stacked ? "grid grid-cols-2 gap-3" : "flex items-center gap-2");
  if (me?.signedIn)
    return (
      <div className={wrap}>
        <form action={logout} className={stacked ? "contents" : undefined}>
          <button type="submit" className={buttonClasses({ variant: "secondary", size })}>
            <LogOut className="size-4" aria-hidden /> Log out
          </button>
        </form>
        <ButtonLink href={me.home} size={size}>
          <LayoutDashboard className="size-4" aria-hidden /> Dashboard
        </ButtonLink>
      </div>
    );
  return (
    <div className={wrap}>
      <ButtonLink href="/register" variant="secondary" size={size}>Register</ButtonLink>
      <ButtonLink href="/login" size={size}>Login</ButtonLink>
    </div>
  );
}
