import type { Metadata } from "next";
import { CertificateManager } from "@/components/admin/CertificateManager";
import { DashboardHeader } from "@/components/dashboard/widgets";
import { ButtonLink } from "@/components/ui/Button";
import { getAllCertificates, getCourses, getPartners, getPortalIdentity } from "@/lib/api";
import { isDemoMode } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Certificates" };

export default async function AdminCertificatesPage() {
  await getPortalIdentity("admin");
  const [certs, courses, partners] = await Promise.all([getAllCertificates(), getCourses(), getPartners()]);
  return (
    <>
      <DashboardHeader
        title="Certificate registry"
        description="Issue, verify, revoke and restore certificates. Every change is recorded and reflected on public verification immediately."
        action={isDemoMode() ? undefined : <ButtonLink href="/admin/legacy-import" variant="secondary">Import old results</ButtonLink>}
      />
      <CertificateManager initial={certs} courses={courses} partners={partners} live={!isDemoMode()} />
    </>
  );
}
