import { ArrowLeft, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CertificatePreview } from "@/components/certificate/CertificatePreview";
import { MarkSheet } from "@/components/certificate/MarkSheet";
import { DashboardCard } from "@/components/dashboard/widgets";
import { getCertificate, getCurrentUser, getSite } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { certificateQrSvg } from "@/lib/qr";
import { verifyCertificate } from "@/lib/verification";
import { CertificateActions } from "./CertificateActions";

export async function generateMetadata({ params }: PageProps<"/dashboard/certificates/[id]">): Promise<Metadata> {
  return { title: `Certificate ${(await params).id}` };
}

export default async function CertificateDetailPage({ params }: PageProps<"/dashboard/certificates/[id]">) {
  const [cert, user, site] = await Promise.all([getCertificate((await params).id), getCurrentUser(), getSite()]);
  // Students may only open their own certificates; others use public verification.
  if (!cert || cert.holderUserId !== user.id) notFound();
  const qr = await certificateQrSvg(cert.id, site.url);
  const details = (await verifyCertificate(cert.id)).details;
  const rows: [string, string][] = [
    ["Certificate ID", cert.id],
    ["Student Name", cert.holderName],
    ["Course", cert.courseTitle],
    ["Training Provider", cert.issuedByName],
    ["Issue Date", formatDate(cert.issueDate)],
    ["Grade", cert.grade ?? "—"],
  ];
  return (
    <>
      <Link href="/dashboard/certificates" className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 print:hidden">
        <ArrowLeft className="size-4" aria-hidden /> All certificates
      </Link>
      <div className="grid gap-8 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6 self-start">
          <CertificatePreview certificate={cert} qrSvg={qr} signatory={site.certificate} issuerName={site.name} />
          {details && (
            <div className="overflow-hidden rounded-2xl border border-line bg-white">
              <MarkSheet details={details} holderName={cert.holderName} courseTitle={cert.courseTitle} />
            </div>
          )}
        </div>
        <div className="space-y-6 print:hidden">
          <DashboardCard title="Certificate details">
            <dl className="space-y-3 text-sm">
              {rows.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-line pb-3 last:border-0 last:pb-0">
                  <dt className="text-muted">{k}</dt>
                  <dd className={`text-right font-semibold text-navy-900 ${k === "Certificate ID" ? "font-mono" : ""}`}>{v}</dd>
                </div>
              ))}
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted">Verification Status</dt>
                <dd className="inline-flex items-center gap-1 rounded-full bg-verify-600 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
                  <ShieldCheck className="size-3.5" aria-hidden /> {cert.status}
                </dd>
              </div>
            </dl>
          </DashboardCard>
          <DashboardCard title="QR verification">
            <div className="flex items-center gap-4">
              <div className="size-24 shrink-0 rounded-xl border border-line p-2 [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: qr }} aria-label="QR code linking to the verification page" role="img" />
              <p className="text-sm text-muted">Scanning opens the NYTI verification page with this certificate ID pre-filled.</p>
            </div>
          </DashboardCard>
          <CertificateActions id={cert.id} verifyUrl={`/verify-certificate?id=${cert.id}`} />
        </div>
      </div>
    </>
  );
}
