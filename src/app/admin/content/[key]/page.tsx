import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentForm } from "@/components/admin/content/ContentForm";
import type { Json } from "@/components/admin/content/TreeEditor";
import { DashboardHeader } from "@/components/dashboard/widgets";
import { ButtonLink } from "@/components/ui/Button";
import { getPortalIdentity } from "@/lib/api";
import { isDemoMode } from "@/lib/auth/session";
import { editorOptions } from "@/lib/content-admin/options";
import { getDef, loadContent } from "@/lib/content-admin/store";

export async function generateMetadata({ params }: PageProps<"/admin/content/[key]">): Promise<Metadata> {
  return { title: (await getDef((await params).key))?.label ?? "Website" };
}

type Rec = Record<string, unknown>;

export default async function ContentPage({ params }: PageProps<"/admin/content/[key]">) {
  await getPortalIdentity("admin");
  const def = await getDef((await params).key);
  if (!def) notFound();
  const { data, version } = await loadContent(def.file);
  const back = <Link href="/admin/content" className="text-sm font-semibold text-brand-700 hover:underline">← Website content</Link>;

  if (def.kind === "document") {
    return (
      <>
        {back}
        <DashboardHeader title={def.label} description={def.description} />
        <ContentForm key={version} defKey={def.key} kind="document" recordId={null} initial={withDefaults(data as Rec, def.template)} version={version} hints={def.hints} options={await editorOptions()} publicHref={def.publicHref?.({}) ?? null} backHref="/admin/content" />
      </>
    );
  }

  const items = data as Rec[];
  const learners = def.key === "courses" ? await activeLearners() : null;
  return (
    <>
      {back}
      <DashboardHeader
        title={def.label}
        description={def.description}
        action={<ButtonLink href={`/admin/content/${def.key}/new`}><Plus className="size-4" aria-hidden /> Add {def.singular}</ButtonLink>}
      />
      <div className="relative overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="sr-only">{def.label}</caption>
          <thead className="border-b border-line bg-surface text-xs uppercase tracking-wide text-muted">
            <tr>
              <th scope="col" className="px-4 py-3">{def.titleField === "name" ? "Name" : "Title"}</th>
              {def.columns?.map((c) => <th key={c.field} scope="col" className="px-4 py-3">{c.label}</th>)}
              {learners && <th scope="col" className="px-4 py-3 text-right">Active learners</th>}
              <th scope="col" className="px-4 py-3 text-right"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((r) => {
              const id = String(r.id);
              return (
                <tr key={id}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/content/${def.key}/${encodeURIComponent(id)}`} className="font-semibold text-navy-900 hover:text-brand-700">{String(r[def.titleField ?? "title"] || "(untitled)")}</Link>
                    {r.featured === true && <span className="ml-2 rounded-full bg-seal-100 px-2 py-0.5 text-[11px] font-semibold text-seal-700">Featured</span>}
                  </td>
                  {def.columns?.map((c) => <td key={c.field} className="px-4 py-3 text-muted">{display(r[c.field])}</td>)}
                  {learners && <td className="px-4 py-3 text-right font-semibold tabular-nums">{isDemoMode() ? "—" : learners.get(id) ?? 0}</td>}
                  <td className="px-4 py-3 text-right"><Link href={`/admin/content/${def.key}/${encodeURIComponent(id)}`} className="font-semibold text-brand-700 hover:underline">Edit</Link></td>
                </tr>
              );
            })}
            {items.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-muted">Nothing here yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** Adds fields missing from an older file (after the existing ones, keeping their order). */
const withDefaults = (data: Rec, template: Rec = {}) => ({ ...data, ...Object.fromEntries(Object.entries(template).filter(([k]) => !(k in data))) }) as Json;

const display = (v: unknown) => (v === undefined || v === null || v === "" ? "—" : typeof v === "number" ? v.toLocaleString("en-US") : String(v));

async function activeLearners() {
  if (isDemoMode()) return new Map<string, number>();
  const { count, eq } = await import("drizzle-orm");
  const { db } = await import("@/lib/db/client");
  const t = await import("@/lib/db/schema");
  const rows = await db().select({ courseId: t.enrollments.courseId, n: count() }).from(t.enrollments).where(eq(t.enrollments.status, "active")).groupBy(t.enrollments.courseId);
  return new Map(rows.map((r) => [r.courseId, Number(r.n)]));
}
