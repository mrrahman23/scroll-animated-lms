import { CreditCard } from "lucide-react";
import type { Metadata } from "next";
import { DashboardHeader, StatsCard } from "@/components/dashboard/widgets";
import { Badge } from "@/components/ui/Badge";
import { getCourses, getCurrentUser, getPayments } from "@/lib/api";
import { formatDate, formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Payments" };

export default async function PaymentsPage() {
  const user = await getCurrentUser();
  const [payments, courses] = await Promise.all([getPayments(user.id), getCourses()]);
  const byId = Object.fromEntries(courses.map((c) => [c.id, c]));
  const total = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const outstanding = payments.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0);
  return (
    <>
      <DashboardHeader title="Payments" description="Invoices and payment history." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatsCard label="Total paid" value={formatPrice(total)} icon={CreditCard} />
        <StatsCard label="Invoices" value={payments.length} icon={CreditCard} tone="navy" />
        <StatsCard label="Awaiting confirmation" value={`৳${outstanding.toLocaleString("en-US")}`} icon={CreditCard} tone={outstanding ? "seal" : "verify"} />
      </div>
      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="sr-only">Payment history</caption>
          <thead className="border-b border-line bg-surface text-xs uppercase tracking-wide text-muted">
            <tr><th scope="col" className="px-4 py-3">Invoice</th><th scope="col" className="px-4 py-3">Course</th><th scope="col" className="px-4 py-3">Date</th><th scope="col" className="px-4 py-3">Method</th><th scope="col" className="px-4 py-3 text-right">Amount</th><th scope="col" className="px-4 py-3">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {payments.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3.5 font-mono text-xs">{p.invoiceNo}</td>
                <td className="px-4 py-3.5 font-medium text-navy-900">{byId[p.courseId].title}</td>
                <td className="px-4 py-3.5 text-muted">{formatDate(p.date, "short")}</td>
                <td className="px-4 py-3.5 text-muted">{p.method}{p.transactionRef && <span className="block font-mono text-[11px]">{p.transactionRef}</span>}</td>
                <td className="px-4 py-3.5 text-right font-semibold tabular-nums">{formatPrice(p.amount)}</td>
                <td className="px-4 py-3.5"><Badge tone={p.status === "paid" ? "verify" : p.status === "failed" ? "danger" : "warning"} className="capitalize">{p.status === "pending" ? "Under review" : p.status === "failed" ? "Not confirmed" : p.status}</Badge>{p.note && <span className="mt-1 block text-xs text-muted">{p.note}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
