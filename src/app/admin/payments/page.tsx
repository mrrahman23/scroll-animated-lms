import type { Metadata } from "next";
import { reviewPaymentAction } from "@/app/admin/actions";
import { ReviewButtons } from "@/components/admin/ReviewButtons";
import { DemoNotice } from "@/components/dashboard/DemoNotice";
import { DashboardHeader } from "@/components/dashboard/widgets";
import { Badge } from "@/components/ui/Badge";
import { getCourses, getPortalIdentity } from "@/lib/api";
import { isDemoMode } from "@/lib/auth/session";
import { formatDate, formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Payments" };

const tone = { paid: "verify", pending: "warning", refunded: "neutral", failed: "danger" } as const;

export default async function Page() {
  await getPortalIdentity("admin");
  if (isDemoMode()) return <DemoNotice title="Payments" />;
  const { listPayments } = await import("@/lib/services/admin");
  const [rows, courses] = await Promise.all([listPayments(), getCourses()]);
  return (
    <>
      <DashboardHeader title="Payments" description="Check each transaction ID in your bKash / Nagad / bank statement, then confirm to activate the enrolment." />
      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[860px] text-left text-sm">
          <caption className="sr-only">Payments</caption>
          <thead className="border-b border-line bg-surface text-xs uppercase tracking-wide text-muted">
            <tr><th scope="col" className="px-4 py-3">Learner</th><th scope="col" className="px-4 py-3">Course</th><th scope="col" className="px-4 py-3">Method · Transaction ID</th><th scope="col" className="px-4 py-3 text-right">Amount</th><th scope="col" className="px-4 py-3">Date</th><th scope="col" className="px-4 py-3">Status</th><th scope="col" className="px-4 py-3 text-right">Action</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map(({ pay, learner }) => (
              <tr key={pay.id}>
                <td className="px-4 py-3"><span className="block font-medium text-navy-900">{learner?.name ?? pay.userId}</span><span className="block text-xs text-muted">{learner?.email}</span></td>
                <td className="px-4 py-3">{courses.find((c) => c.id === pay.courseId)?.title ?? pay.courseId}</td>
                <td className="px-4 py-3">{pay.method} · <span className="font-mono text-xs">{pay.transactionRef ?? "—"}</span><span className="block font-mono text-[11px] text-muted">{pay.invoiceNo}</span></td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatPrice(pay.amount)}</td>
                <td className="px-4 py-3 text-muted">{formatDate(pay.date, "short")}</td>
                <td className="px-4 py-3"><Badge tone={tone[pay.status]} className="capitalize">{pay.status}</Badge>{pay.note && <span className="block text-xs text-muted">{pay.note}</span>}</td>
                <td className="px-4 py-3">
                  {pay.status === "pending" ? (
                    <ReviewButtons
                      approveLabel="Confirm"
                      onApprove={reviewPaymentAction.bind(null, pay.id, true, "")}
                      onReject={reviewPaymentAction.bind(null, pay.id, false)}
                      askNote="Why couldn't the payment be confirmed? (shown to the learner)"
                    />
                  ) : null}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-muted">No payments yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
