"use client";

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/forms";
import { cn } from "@/lib/format";
import type { UserRole } from "@/types";

const roleHome: Record<UserRole, string> = { student: "/dashboard", instructor: "/instructor", partner: "/partner-portal", admin: "/admin" };

/** Used when no database is configured: role picker that opens the demo portals. */
export function DemoAuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [role, setRole] = useState<UserRole>("student");
  const [loading, setLoading] = useState(false);
  const isLogin = mode === "login";

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        setLoading(true);
        // TODO: replace with auth provider (e.g. POST /api/auth/session)
        setTimeout(() => router.push(roleHome[role]), 500);
      }}
    >
      {isLogin && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-navy-900">Sign in as</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(["student", "instructor", "partner", "admin"] as const).map((r) => (
              <label key={r} className={cn("cursor-pointer rounded-lg border px-2 py-2 text-center text-xs font-semibold capitalize transition-colors has-focus-visible:ring-4 has-focus-visible:ring-brand-200", role === r ? "border-brand-600 bg-brand-50 text-brand-800" : "border-line text-slate-600 hover:border-navy-300")}>
                <input type="radio" name="role" className="sr-only" checked={role === r} onChange={() => setRole(r)} />
                {r}
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">Demo only — the role will come from your account once authentication is connected.</p>
        </fieldset>
      )}
      {!isLogin && (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="First name" htmlFor="first" required><Input id="first" autoComplete="given-name" required /></Field>
          <Field label="Last name" htmlFor="last" required><Input id="last" autoComplete="family-name" required /></Field>
        </div>
      )}
      <Field label={isLogin ? "Email or phone" : "Email"} htmlFor="email" required>
        <Input id="email" type={isLogin ? "text" : "email"} autoComplete="username" required defaultValue={isLogin ? "reja@example.com" : undefined} />
      </Field>
      {!isLogin && (
        <Field label="Mobile number" htmlFor="phone" hint="Used for course updates and OTP verification."><Input id="phone" type="tel" autoComplete="tel" placeholder="01XXXXXXXXX" /></Field>
      )}
      <Field label="Password" htmlFor="password" required hint={isLogin ? undefined : "At least 8 characters, with a number."}>
        <div className="relative">
          <Input id="password" type={show ? "text" : "password"} autoComplete={isLogin ? "current-password" : "new-password"} required minLength={isLogin ? undefined : 8} defaultValue={isLogin ? "demo-password" : undefined} className="pr-11" />
          <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted hover:text-navy-900" aria-label={show ? "Hide password" : "Show password"}>
            {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          </button>
        </div>
      </Field>
      {!isLogin && (
        <Field label="I want to" htmlFor="intent">
          <Select id="intent" defaultValue="learn"><option value="learn">Learn and get certified</option><option value="teach">Teach as an instructor</option></Select>
        </Field>
      )}
      {isLogin ? (
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-slate-700"><input type="checkbox" className="size-4 rounded border-navy-300 accent-brand-600" /> Remember me</label>
          <Link href="/help" className="font-semibold text-brand-700 hover:text-brand-800">Forgot password?</Link>
        </div>
      ) : (
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" required className="mt-0.5 size-4 rounded border-navy-300 accent-brand-600" />
          <span>I agree to the <Link href="/terms" className="font-semibold text-brand-700">Terms</Link> and <Link href="/privacy" className="font-semibold text-brand-700">Privacy Policy</Link>.</span>
        </label>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? "Please wait…" : isLogin ? "Login" : "Create Account"}
      </Button>
      <p className="text-center text-sm text-muted">
        {isLogin ? "New to NYTI? " : "Already have an account? "}
        <Link href={isLogin ? "/register" : "/login"} className="font-semibold text-brand-700 hover:text-brand-800">{isLogin ? "Create an account" : "Login"}</Link>
      </p>
    </form>
  );
}
