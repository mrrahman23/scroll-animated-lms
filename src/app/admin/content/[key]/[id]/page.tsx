import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentForm } from "@/components/admin/content/ContentForm";
import type { Json } from "@/components/admin/content/TreeEditor";
import { DashboardHeader } from "@/components/dashboard/widgets";
import { getPortalIdentity } from "@/lib/api";
import { editorOptions } from "@/lib/content-admin/options";
import { getDef, loadContent } from "@/lib/content-admin/store";

type Rec = Record<string, unknown>;

export async function generateMetadata({ params }: PageProps<"/admin/content/[key]/[id]">): Promise<Metadata> {
  const def = await getDef((await params).key);
  return { title: def ? `Edit ${def.singular ?? def.label}` : "Website" };
}

export default async function RecordPage({ params }: PageProps<"/admin/content/[key]/[id]">) {
  await getPortalIdentity("admin");
  const { key, id: rawId } = await params;
  const def = await getDef(key);
  if (!def || def.kind !== "collection") notFound();
  const id = decodeURIComponent(rawId);
  const { data, version } = await loadContent<Rec[]>(def.file);
  const isNew = id === "new";
  const record = isNew ? structuredClone(def.template ?? {}) : data.find((r) => String(r.id) === id);
  if (!record) notFound();
  // The id is fixed (other content and learners' records point at it), so it isn't edited
  const { id: _id, ...stored } = record;
  void _id;
  // Fields added in later versions show up on older records too
  const fields = { ...stored, ...Object.fromEntries(Object.entries(def.template ?? {}).filter(([k]) => !(k in stored))) };
  const title = isNew ? `New ${def.singular}` : String(record[def.titleField ?? "title"] || def.singular);
  return (
    <>
      <Link href={`/admin/content/${def.key}`} className="text-sm font-semibold text-brand-700 hover:underline">← {def.label}</Link>
      <DashboardHeader title={title} description={isNew ? "Fill in the details and add it. You can change everything later." : <>ID <code className="font-mono text-xs">{id}</code> · {def.description}</>} />
      <ContentForm
        key={version}
        defKey={def.key}
        kind="record"
        recordId={isNew ? null : id}
        singular={def.singular}
        initial={fields as Json}
        version={version}
        hints={def.hints}
        options={await editorOptions()}
        publicHref={isNew ? null : def.publicHref?.(record) ?? null}
        backHref={`/admin/content/${def.key}`}
      />
    </>
  );
}
