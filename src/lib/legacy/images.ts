import "server-only";
import { existsSync, promises as fs } from "node:fs";
import path from "node:path";
import { eq, or, and, isNotNull, notLike } from "drizzle-orm";
import { db } from "@/lib/db/client";
import * as t from "@/lib/db/schema";
import { UPLOAD_DIR } from "@/lib/content-admin/store";

/**
 * Photos and scanned certificates referenced by imported records live on the old site
 * (verify.nytibd.com/storage/images/…). They're shown from there until copied here into
 * data/uploads/legacy/, after which the old site can be switched off.
 */
export const LEGACY_SITE = (process.env.LEGACY_SITE_URL || "https://verify.nytibd.com").replace(/\/$/, "");
const LEGACY_DIR = path.join(UPLOAD_DIR, "legacy");
const SAFE_PATH = /^images\/(image|certificate)\/[\w.-]+\.(jpe?g|png|webp|gif)$/i;
const MAX_BYTES = 15 * 1024 * 1024;

/** Public URL for a stored photo/scan value. */
export function legacyImageUrl(value: string | null | undefined) {
  if (!value) return null;
  if (value.startsWith("/")) return value;
  if (!SAFE_PATH.test(value)) return null;
  return existsSync(path.join(LEGACY_DIR, value)) ? `/uploads/legacy/${value}` : `${LEGACY_SITE}/storage/${value}`;
}

const isImage = (b: Buffer) =>
  (b[0] === 0xff && b[1] === 0xd8) || b.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])) || b.subarray(0, 4).toString() === "GIF8" || b.subarray(8, 12).toString() === "WEBP";

/** Copies up to `limit` missing images; returns how many are left. */
export async function copyLegacyImages(limit = 20) {
  const rows = await db()
    .select({ id: t.certificateDetails.certificateId, photo: t.certificateDetails.photo, scan: t.certificateDetails.scan })
    .from(t.certificateDetails)
    .where(or(and(isNotNull(t.certificateDetails.photo), notLike(t.certificateDetails.photo, "/%")), and(isNotNull(t.certificateDetails.scan), notLike(t.certificateDetails.scan, "/%"))));

  const pending: { id: string; field: "photo" | "scan"; value: string }[] = [];
  for (const r of rows) {
    for (const field of ["photo", "scan"] as const) {
      const v = r[field];
      if (v && !v.startsWith("/")) pending.push({ id: r.id, field, value: v });
    }
  }
  let copied = 0;
  const failed: string[] = [];
  const batch = pending.slice(0, limit);
  await Promise.all(
    batch.map(async (job) => {
      try {
        if (!SAFE_PATH.test(job.value)) throw new Error("unexpected path");
        const dest = path.join(LEGACY_DIR, job.value);
        if (!existsSync(dest)) {
          const res = await fetch(`${LEGACY_SITE}/storage/${job.value}`, { signal: AbortSignal.timeout(30000) });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const bytes = Buffer.from(await res.arrayBuffer());
          if (bytes.length > MAX_BYTES || !isImage(bytes)) throw new Error("not an image");
          await fs.mkdir(path.dirname(dest), { recursive: true });
          await fs.writeFile(dest, bytes);
        }
        await db().update(t.certificateDetails).set({ [job.field]: `/uploads/legacy/${job.value}` }).where(eq(t.certificateDetails.certificateId, job.id));
        copied++;
      } catch (err) {
        const reason = err instanceof Error ? err.message : "failed";
        failed.push(`${job.value} (${reason})`);
        // Gone from the old site (or not an image): clear it so it isn't retried. Network errors are retried next time.
        if (/^HTTP 40[34]|^HTTP 410|not an image|unexpected path/.test(reason)) await db().update(t.certificateDetails).set({ [job.field]: null }).where(eq(t.certificateDetails.certificateId, job.id));
      }
    }),
  );
  return { copied, failed, remaining: pending.length - batch.length };
}

export async function legacyImageStatus() {
  const rows = await db().select({ photo: t.certificateDetails.photo, scan: t.certificateDetails.scan }).from(t.certificateDetails).where(isNotNull(t.certificateDetails.legacyStudentId));
  let local = 0;
  let remote = 0;
  for (const r of rows)
    for (const v of [r.photo, r.scan]) {
      if (!v) continue;
      if (v.startsWith("/")) local++;
      else remote++;
    }
  return { local, remote };
}
