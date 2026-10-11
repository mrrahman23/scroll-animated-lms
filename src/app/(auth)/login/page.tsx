import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ROLE_HOME, getSession, isDemoMode } from "@/lib/auth/session";
import { LoginForm } from "../AuthForm";
import { DemoAuthForm } from "../DemoAuthForm";

export const metadata: Metadata = { title: "Login" };

export default async function Page({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const nextPath = typeof next === "string" ? next : undefined;
  if (!isDemoMode()) {
    const user = await getSession();
    if (user) redirect(ROLE_HOME[user.role]);
  }
  return (
    <>
      <h1 className="display text-3xl">Welcome back</h1>
      <p className="mb-8 mt-2 text-muted">Sign in to continue learning and access your certificates.</p>
      {isDemoMode() ? <DemoAuthForm mode="login" /> : <LoginForm next={nextPath} />}
    </>
  );
}
