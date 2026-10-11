import type { Metadata } from "next";
import Link from "next/link";
import { DemoNotice } from "@/components/dashboard/DemoNotice";
import { DashboardHeader } from "@/components/dashboard/widgets";
import { Badge } from "@/components/ui/Badge";
import { getPortalIdentity } from "@/lib/api";
import { isDemoMode } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Issued certificates" };

export default async function Page() {
  const me = await getPortalIdentity("partner");
  if (isDemoMode() || !me.partnerId) return <DemoNotice title="Issued certificates" />;
  const { partnerCertificates } = await import("@/lib/services/portals");
  const certs = await partnerCertificates(me.partnerId);
  return (
    <>
      <DashboardHeader title="Issued certificates" description="Certificates issued in your organisation's name. Anyone can check them on the public verification page." />
      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="sr-only">Issued certificates</caption>
          <thead className="border-b border-line bg-surface text-xs uppercase tracking-wide text-muted">
            <tr><th scope="col" className="px-4 py-3">Certificate ID</th><th scope="col" className="px-4 py-3">Holder</th><th scope="col" className="px-4 py-3">Course</th><th scope="col" className="px-4 py-3">Issued</th><th scope="col" className="px-4 py-3">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {certs.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3"><Link href={`/verify-certificate?id=${c.id}`} className="font-mono text-xs font-semibold text-brand-700 hover:underline">{c.id}</Link></td>
                <td className="px-4 py-3 font-medium text-navy-900">{c.holderName}</td>
                <td className="px-4 py-3">{c.courseTitle}</td>
                <td className="px-4 py-3 text-muted">{formatDate(c.issueDate, "short")}</td>
                <td className="px-4 py-3"><Badge tone={c.status === "valid" ? "verify" : c.status === "revoked" ? "danger" : "warning"} className="capitalize">{c.status}</Badge></td>
              </tr>
            ))}
            {certs.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">No certificates issued yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
