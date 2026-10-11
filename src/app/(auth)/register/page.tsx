import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ROLE_HOME, getSession, isDemoMode } from "@/lib/auth/session";
import { RegisterForm } from "../AuthForm";
import { DemoAuthForm } from "../DemoAuthForm";

export const metadata: Metadata = { title: "Register" };

export default async function Page({ searchParams }: PageProps<"/register">) {
  const { next } = await searchParams;
  const nextPath = typeof next === "string" ? next : undefined;
  if (!isDemoMode()) {
    const user = await getSession();
    if (user) redirect(ROLE_HOME[user.role]);
  }
  return (
    <>
      <h1 className="display text-3xl">Create your NYTI account</h1>
      <p className="mb-8 mt-2 text-muted">Free to join. Enrol in courses, track progress and receive verifiable certificates.</p>
      {isDemoMode() ? <DemoAuthForm mode="register" /> : <RegisterForm next={nextPath} />}
    </>
  );
}
