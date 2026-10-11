import { ShieldCheck } from "lucide-react";
import { LearnCertifyVerify } from "@/components/home/LearnCertifyVerify";
import { Logo } from "@/components/layout/Logo";
import { getSite, getTestimonials } from "@/lib/api";

// Personal pages: always rendered per request (they read the sign-in cookie).
export const dynamic = "force-dynamic";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const [site, testimonials] = await Promise.all([getSite(), getTestimonials()]);
  const quote = testimonials[0];
  return (
    <main id="main" className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col px-4 py-8 sm:px-10 lg:px-16">
        <Logo />
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">{children}</div>
        <p className="text-xs text-muted">{site.copyright}</p>
      </div>
      <aside className="island relative hidden overflow-hidden bg-navy-900 text-white lg:flex lg:flex-col lg:justify-between lg:p-16">
        <div className="guilloche absolute inset-0" aria-hidden />
        <div className="relative"><LearnCertifyVerify inverse size="lg" /></div>
        {quote && (
          <div className="relative">
            <p className="font-display text-4xl font-semibold leading-tight">“{quote.quote}”</p>
            <p className="mt-6 text-navy-200">
              {quote.name} · {quote.courseTitle} {quote.isSample && <span className="text-navy-400">(sample)</span>}
            </p>
          </div>
        )}
        <p className="relative flex items-center gap-2 text-sm text-navy-200"><ShieldCheck className="size-4 text-verify-500" aria-hidden /> Secure sign-in · Your data is protected</p>
      </aside>
    </main>
  );
}
