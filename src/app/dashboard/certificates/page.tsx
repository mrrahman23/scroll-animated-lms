import { Award, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DashboardCard, DashboardHeader } from "@/components/dashboard/widgets";
import { Badge } from "@/components/ui/Badge";
import { getCertificatesForUser, getCurrentUser } from "@/lib/api";
import { isDemoMode } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { ClaimCertificate } from "./ClaimCertificate";

export const metadata: Metadata = { title: "Certificates" };

export default async function CertificatesPage() {
  const user = await getCurrentUser();
  const certs = await getCertificatesForUser(user.id);
  const claims = isDemoMode() ? [] : (await (await import("@/lib/services/results")).listClaims({ userId: user.id })).map((c) => ({ certificateId: c.claim.certificateId, status: c.claim.status, note: c.claim.note }));
  return (
    <>
      <DashboardHeader title="Certificates" description="Your NYTI-certified certificates. Each can be verified publicly with its ID or QR code." />
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {certs.map((c) => (
          <Link key={c.id} href={`/dashboard/certificates/${c.id}`} className="fx-card group relative overflow-hidden rounded-2xl border border-line bg-white shadow-(--shadow-card) transition-all hover:-translate-y-1 hover:shadow-(--shadow-lift)">
            <div className="paper guilloche-ink flex items-center justify-center bg-[#fffdf8] py-10">
              <Award className="size-16 text-seal-500 transition-transform duration-500 group-hover:scale-110" strokeWidth={1.2} aria-hidden />
            </div>
            <div className="border-t border-line p-5">
              <Badge tone={c.status === "valid" ? "verify" : "danger"} icon={<ShieldCheck className="size-3.5" aria-hidden />}><span className="capitalize">{c.status}</span></Badge>
              <h2 className="mt-3 font-semibold text-navy-900">{c.courseTitle}</h2>
              <p className="mt-1 font-mono text-xs text-muted">{c.id}</p>
              <p className="mt-3 text-sm text-muted">Issued {formatDate(c.issueDate)} · {c.issuedByName}</p>
            </div>
          </Link>
        ))}
        {certs.length === 0 && <p className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-muted md:col-span-2 xl:col-span-3">No certificates yet. They appear here when you complete a course, or when NYTI publishes your results.</p>}
      </div>
      {!isDemoMode() && (
        <DashboardCard title="Add an existing certificate" className="mt-8">
          <ClaimCertificate claims={claims.filter((c) => !certs.some((x) => x.id === c.certificateId) || c.status !== "approved")} />
        </DashboardCard>
      )}
    </>
  );
}
