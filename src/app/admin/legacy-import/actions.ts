"use server";

import { existsSync, promises as fs } from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { getSite } from "@/lib/api";
import { actor } from "@/lib/auth/session";
import { DATA_DIR } from "@/lib/content-admin/store";
import { hasDatabase } from "@/lib/db/client";
import { copyLegacyImages } from "@/lib/legacy/images";
import { addLegacyCourses, previewLegacy, previewLegacyCourses, runLegacyImport, type ImportPreview, type InstituteChoice } from "@/lib/legacy/import";

/** The uploaded export is kept here (outside the public uploads) until the next upload. */
const DUMP = path.join(DATA_DIR, "legacy-import", "latest.sql");

async function admin() {
  if (!hasDatabase()) throw new Error("Importing old results needs the database to be connected.");
  try {
    return (await actor("admin")).email;
  } catch {
    throw new Error("Only administrators can import results.");
  }
}

const fail = (err: unknown) => ({ ok: false as const, message: err instanceof Error ? err.message : "Something went wrong." });

export async function uploadLegacyDumpAction(form: FormData): Promise<{ ok: true; preview: ImportPreview } | { ok: false; message: string }> {
  try {
    await admin();
    const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    if (!files.length) return { ok: false, message: "Choose the .sql export file(s) first." };
    if (files.some((f) => !f.name.toLowerCase().endsWith(".sql"))) return { ok: false, message: "Only .sql files exported from phpMyAdmin can be imported." };
    const text = (await Promise.all(files.map((f) => f.text()))).join("\n");
    const preview = await previewLegacy(text);
    await fs.mkdir(path.dirname(DUMP), { recursive: true });
    await fs.writeFile(DUMP, text, "utf8");
    return { ok: true, preview };
  } catch (err) {
    return fail(err);
  }
}

export async function currentLegacyPreview(): Promise<ImportPreview | null> {
  await admin();
  if (!existsSync(DUMP)) return null;
  return previewLegacy(await fs.readFile(DUMP, "utf8"));
}

export async function runLegacyImportAction(choices: Record<string, InstituteChoice>) {
  try {
    const who = await admin();
    if (!existsSync(DUMP)) return { ok: false as const, message: "Upload the export first." };
    const site = await getSite();
    const r = await runLegacyImport(await fs.readFile(DUMP, "utf8"), choices, who, site.name);
    revalidatePath("/", "layout");
    const parts = [`${r.inserted} new and ${r.updated} updated certificates`, `${r.subjects} subject results`];
    if (r.partnersCreated.length) parts.push(`new partners: ${r.partnersCreated.join(", ")}`);
    return { ok: true as const, message: `Imported ${parts.join(" · ")}.` };
  } catch (err) {
    console.error("[legacy] import failed:", err);
    return fail(err);
  }
}

export async function copyLegacyImagesAction() {
  try {
    await admin();
    return { ok: true as const, ...(await copyLegacyImages(20)) };
  } catch (err) {
    return fail(err);
  }
}

export async function legacyCoursePlan() {
  await admin();
  if (!existsSync(DUMP)) return null;
  return previewLegacyCourses(await fs.readFile(DUMP, "utf8"));
}

export async function addLegacyCoursesAction() {
  try {
    const who = await admin();
    if (!existsSync(DUMP)) return { ok: false as const, message: "Upload the export first." };
    const r = await addLegacyCourses(await fs.readFile(DUMP, "utf8"), who);
    revalidatePath("/", "layout");
    return {
      ok: true as const,
      message: r.added
        ? `Added ${r.added} courses (${r.withSubjects} with mark sheet subjects)${r.partnersUpdated ? `; ${r.partnersUpdated} partner(s) can now enter results for their courses` : ""}. Complete them in Courses.`
        : `All old courses are already in the course list${r.partnersUpdated ? `; ${r.partnersUpdated} partner(s) updated` : ""}.`,
    };
  } catch (err) {
    console.error("[legacy] courses failed:", err);
    return fail(err);
  }
}
