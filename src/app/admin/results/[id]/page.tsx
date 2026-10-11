import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BatchEditor } from "@/components/results/BatchEditor";
import { DashboardHeader } from "@/components/dashboard/widgets";
import { getPortalIdentity } from "@/lib/api";
import { isDemoMode } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Results batch" };

export default async function AdminBatchPage({ params }: PageProps<"/admin/results/[id]">) {
  const me = await getPortalIdentity("admin");
  const id = Number((await params).id);
  if (isDemoMode() || !Number.isInteger(id)) notFound();
  const { editorProps } = await import("@/components/results/loadEditor");
  const props = await editorProps(id, { id: me.id, role: "admin" }).catch(() => null);
  if (!props) notFound();
  return (
    <>
      <Link href="/admin/results" className="text-sm font-semibold text-brand-700 hover:underline">← Results</Link>
      <DashboardHeader title={props.name} description={props.courseTitle} />
      <BatchEditor key={JSON.stringify(props.students.map((s) => s.id))} {...props} />
    </>
  );
}
