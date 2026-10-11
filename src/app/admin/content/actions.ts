"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { actor } from "@/lib/auth/session";
import { hasDatabase } from "@/lib/db/client";
import { ContentError, getDef, listHistory, loadContent, readHistory, saveContent, saveUpload, type HistoryEntry } from "@/lib/content-admin/store";

export type SaveResult = { ok: boolean; message: string; problems?: string[]; version?: string; id?: string };
type Rec = Record<string, unknown>;

/** Who may edit: an admin when the database is connected; anyone on a local demo (`npm run dev`). */
async function editor() {
  if (hasDatabase()) {
    try {
      return (await actor("admin")).email;
    } catch {
      throw new ContentError("Only administrators can edit the website.");
    }
  }
  if (process.env.NODE_ENV === "production") throw new ContentError("Connect the database and sign in as an admin to edit a live site.");
  return "demo";
}

async function guarded(fn: () => Promise<SaveResult>): Promise<SaveResult> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ContentError) return { ok: false, message: err.message, problems: err.problems };
    console.error("[content] save failed:", err);
    return { ok: false, message: "Something went wrong while saving. Please try again." };
  }
}

async function defOrThrow(key: string) {
  const def = await getDef(key);
  if (!def) throw new ContentError("Unknown content.");
  return def;
}

const done = (message: string, version: string, id?: string): SaveResult => {
  // Every page reads this content, so refresh them all
  revalidatePath("/", "layout");
  return { ok: true, message, version, id };
};

export async function saveDocumentAction(key: string, data: unknown, version: string): Promise<SaveResult> {
  return guarded(async () => {
    const savedBy = await editor();
    const def = await defOrThrow(key);
    if (def.kind !== "document" || !data || typeof data !== "object" || Array.isArray(data)) throw new ContentError("Unexpected content.");
    const r = await saveContent(def.file, data, { version, savedBy });
    return done(`${def.label} saved. The website shows the change now.`, r.version);
  });
}

const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

/** Saves one record of a collection (courses, partners, …); `id` null adds a new one. */
export async function saveRecordAction(key: string, id: string | null, record: Rec, version: string): Promise<SaveResult> {
  return guarded(async () => {
    const savedBy = await editor();
    const def = await defOrThrow(key);
    if (def.kind !== "collection" || !record || typeof record !== "object") throw new ContentError("Unexpected content.");
    const { data: list } = await loadContent<Rec[]>(def.file);
    // The id is fixed by the server (other content and learners' records point at it)
    const { id: _ignored, ...fields } = record;
    void _ignored;
    let next: Rec = fields;
    const title = String(next[def.titleField ?? "title"] ?? "").trim();
    if (!title) throw new ContentError(`Please enter a ${def.titleField ?? "title"}.`);
    if (def.slugFrom && !String(next.slug ?? "").trim()) next.slug = slugify(String(next[def.slugFrom] ?? ""));

    let items: Rec[];
    if (id === null) {
      const prefix = def.idPrefix ?? def.key;
      let newId: string;
      do newId = `${prefix}-${randomBytes(3).toString("hex")}`;
      while (list.some((x) => x.id === newId));
      next = { id: newId, ...next };
      if (def.key === "courses") fillCurriculumIds(next);
      items = [...list, next];
    } else {
      const at = list.findIndex((x) => x.id === id);
      if (at < 0) throw new ContentError("This item no longer exists — it may have been deleted by someone else.");
      next = { id, ...next };
      if (def.key === "courses") fillCurriculumIds(next);
      items = list.map((x, i) => (i === at ? next : x));
    }
    const r = await saveContent(def.file, items, { version, savedBy });
    return done(`${title} saved.`, r.version, String(next.id));
  });
}

export async function deleteRecordAction(key: string, id: string, version: string): Promise<SaveResult> {
  return guarded(async () => {
    const savedBy = await editor();
    const def = await defOrThrow(key);
    if (def.kind !== "collection") throw new ContentError("Unexpected content.");
    const { data: list } = await loadContent<Rec[]>(def.file);
    const item = list.find((x) => x.id === id);
    if (!item) throw new ContentError("This item no longer exists.");
    await assertNotInUse(def.key, id);
    const r = await saveContent(def.file, list.filter((x) => x.id !== id), { version, savedBy });
    return done(`${String(item[def.titleField ?? "title"] ?? id)} deleted.`, r.version);
  });
}

export async function restoreVersionAction(key: string, historyId: string, version: string): Promise<SaveResult> {
  return guarded(async () => {
    const savedBy = await editor();
    const def = await defOrThrow(key);
    const data = await readHistory(def.file, historyId);
    const r = await saveContent(def.file, data, { version, savedBy });
    return done("That version is restored.", r.version);
  });
}

export async function historyAction(key: string): Promise<HistoryEntry[]> {
  await editor();
  const def = await defOrThrow(key);
  return listHistory(def.file);
}

export async function uploadImageAction(form: FormData): Promise<SaveResult & { url?: string }> {
  try {
    await editor();
    const file = form.get("file");
    if (!(file instanceof File) || !file.size) return { ok: false, message: "Choose an image first." };
    const url = await saveUpload(file, String(form.get("folder") ?? "misc"));
    return { ok: true, message: "Image uploaded — save to publish it.", url };
  } catch (err) {
    if (err instanceof ContentError) return { ok: false, message: err.message };
    console.error("[content] upload failed:", err);
    return { ok: false, message: "The upload failed. Please try again." };
  }
}

/** New modules and lessons get ids; existing ones keep theirs (learners' progress is stored by lesson id). */
function fillCurriculumIds(course: Rec) {
  const base = String(course.id);
  const modules = Array.isArray(course.curriculum) ? (course.curriculum as Rec[]) : [];
  const used = new Set<string>();
  modules.forEach((m) => {
    if (m.id) used.add(String(m.id));
    (Array.isArray(m.lessons) ? (m.lessons as Rec[]) : []).forEach((l) => l.id && used.add(String(l.id)));
  });
  const fresh = (stem: string) => {
    let n = 1;
    while (used.has(`${stem}${n}`)) n++;
    used.add(`${stem}${n}`);
    return `${stem}${n}`;
  };
  const subjects = Array.isArray(course.subjects) ? (course.subjects as Rec[]) : [];
  subjects.forEach((s) => s.id && used.add(String(s.id)));
  subjects.forEach((s) => {
    if (!s.id) s.id = fresh(`${base}-s`);
  });
  modules.forEach((m) => {
    if (!m.id) m.id = fresh(`${base}-m`);
    (Array.isArray(m.lessons) ? (m.lessons as Rec[]) : []).forEach((l) => {
      if (!l.id) l.id = fresh(`${m.id}-l`);
    });
  });
}

/** With MySQL, learners' records point at courses and partners — those can't simply disappear. */
async function assertNotInUse(key: string, id: string) {
  if (!hasDatabase() || (key !== "courses" && key !== "partners")) return;
  const { count, eq } = await import("drizzle-orm");
  const { db } = await import("@/lib/db/client");
  const t = await import("@/lib/db/schema");
  if (key === "courses") {
    const [[e], [c]] = await Promise.all([
      db().select({ n: count() }).from(t.enrollments).where(eq(t.enrollments.courseId, id)),
      db().select({ n: count() }).from(t.certificates).where(eq(t.certificates.courseId, id)),
    ]);
    if (Number(e.n) || Number(c.n)) throw new ContentError(`This course has ${Number(e.n)} enrolment(s) and ${Number(c.n)} certificate(s), so it can't be deleted. Untick "Featured" and remove its intake date instead, or keep it for the records.`);
  } else {
    const [[c], [u]] = await Promise.all([
      db().select({ n: count() }).from(t.certificates).where(eq(t.certificates.issuedByPartnerId, id)),
      db().select({ n: count() }).from(t.users).where(eq(t.users.partnerId, id)),
    ]);
    if (Number(c.n) || Number(u.n)) throw new ContentError(`This partner has issued ${Number(c.n)} certificate(s) and has ${Number(u.n)} user account(s). Set its status to "suspended" instead of deleting it.`);
  }
}
