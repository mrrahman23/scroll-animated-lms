import type { Metadata } from "next";
import { DemoNotice } from "@/components/dashboard/DemoNotice";
import { DashboardHeader, StatsCard } from "@/components/dashboard/widgets";
import { Badge } from "@/components/ui/Badge";
import { getPortalIdentity } from "@/lib/api";
import { isDemoMode } from "@/lib/auth/session";
import { ShieldCheck, ShieldQuestion, Users } from "lucide-react";

export const metadata: Metadata = { title: "Verification log" };

export default async function Page() {
  await getPortalIdentity("admin");
  if (isDemoMode()) return <DemoNotice title="Verification log" />;
  const { listVerificationLogs } = await import("@/lib/services/admin");
  const logs = await listVerificationLogs();
  const found = logs.filter((l) => l.found).length;
  return (
    <>
      <DashboardHeader title="Verification log" description="Latest 300 public certificate lookups. Visitor IPs are stored only as anonymous hashes." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatsCard label="Lookups shown" value={logs.length} icon={ShieldCheck} />
        <StatsCard label="Not found" value={logs.length - found} icon={ShieldQuestion} tone="seal" />
        <StatsCard label="Distinct visitors" value={new Set(logs.map((l) => l.ipHash)).size} icon={Users} tone="navy" />
      </div>
      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="sr-only">Verification log</caption>
          <thead className="border-b border-line bg-surface text-xs uppercase tracking-wide text-muted">
            <tr><th scope="col" className="px-4 py-3">When</th><th scope="col" className="px-4 py-3">Certificate ID searched</th><th scope="col" className="px-4 py-3">Result</th><th scope="col" className="px-4 py-3">Visitor</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-2.5 text-muted">{l.createdAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{l.query}</td>
                <td className="px-4 py-2.5">{l.found ? <Badge tone={l.status === "valid" ? "verify" : l.status === "revoked" ? "danger" : "warning"} className="capitalize">{l.status}</Badge> : <Badge tone="neutral">Not found</Badge>}</td>
                <td className="px-4 py-2.5 font-mono text-[11px] text-muted" title="Anonymous visitor fingerprint">{l.ipHash.slice(0, 10)}</td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-muted">No lookups yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
