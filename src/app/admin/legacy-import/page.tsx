import type { Metadata } from "next";
import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/widgets";
import { getPortalIdentity } from "@/lib/api";
import { isDemoMode } from "@/lib/auth/session";
import { LegacyImporter } from "./LegacyImporter";

export const metadata: Metadata = { title: "Import old results" };

export default async function LegacyImportPage() {
  await getPortalIdentity("admin");
  const back = <Link href="/admin/certificates" className="text-sm font-semibold text-brand-700 hover:underline">← Certificates</Link>;
  const header = <DashboardHeader title="Import old results" description="Bring students, mark sheets and certificates from the previous verification system (verify.nytibd.com) into the certificate registry." />;
  if (isDemoMode()) {
    return (
      <>
        {back}
        {header}
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">Connect the database first — imported results are stored there.</p>
      </>
    );
  }
  const { currentLegacyPreview } = await import("./actions");
  const { legacyImageStatus } = await import("@/lib/legacy/images");
  const { legacyCoursePlan } = await import("./actions");
  const [preview, images, coursePlan] = await Promise.all([currentLegacyPreview().catch(() => null), legacyImageStatus(), legacyCoursePlan().catch(() => null)]);
  return (
    <>
      {back}
      {header}
      <LegacyImporter initial={preview} images={images} coursePlan={coursePlan} />
    </>
  );
}
