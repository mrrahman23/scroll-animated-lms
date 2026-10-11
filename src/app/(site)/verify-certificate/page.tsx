import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { VerificationForm } from "@/components/certificate/VerificationForm";
import { Icon } from "@/components/ui/Icon";
import { getPage } from "@/lib/api";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("verify-certificate");
  return { title: page.title, description: page.subtitle };
}

export default async function VerifyCertificatePage({ searchParams }: PageProps<"/verify-certificate">) {
  const [{ id, reg, roll, by }, page] = await Promise.all([searchParams, getPage("verify-certificate")]);
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

  return (
    <section className="relative overflow-hidden bg-surface">
      <div className="grid-dots absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_65%)]" aria-hidden />
      <div className="container-page relative max-w-3xl py-16 sm:py-24">
        <div className="text-center">
          <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-navy-900 text-white shadow-lg ring-8 ring-navy-100">
            <ShieldCheck className="size-8" aria-hidden />
          </span>
          <h1 className="display mt-8 text-4xl sm:text-5xl">{page.title}</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted">{page.subtitle}</p>
        </div>

        <div className="mt-10">
          <VerificationForm initialId={one(id)} initialReg={one(reg)} initialRoll={one(roll)} initialBy={one(by) === "reg" ? "numbers" : undefined} syncUrl />
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-3">
          {page.features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-line bg-white p-5">
              <Icon name={f.icon} className="size-5 text-brand-600" />
              <h2 className="mt-3 text-sm font-semibold text-navy-900">{f.title}</h2>
              <p className="mt-1 text-sm text-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
