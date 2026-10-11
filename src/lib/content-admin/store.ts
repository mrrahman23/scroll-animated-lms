import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, promises as fs } from "node:fs";
import path from "node:path";
import { hasDatabase } from "@/lib/db/client";
import { checkContent } from "@/lib/content-rules.mjs";
import { CONTENT, pageDef, type ContentDef } from "./registry";

/**
 * Reads and writes the editable content files in /data for the admin editors.
 * - Writes are atomic (temp file + rename), so a visitor never reads half a file.
 * - Every save is validated with the same rules as `npm run check-data`.
 * - A save is refused if the file changed since the editor loaded it (two admins at once).
 * - Each saved version is kept in data/.history/<file>/ (last 30), and can be restored.
 */
export const DATA_DIR = path.join(process.cwd(), "data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const HISTORY_DIR = path.join(DATA_DIR, ".history");
const PUBLIC_DIR = path.join(process.cwd(), "public");
const KEEP_VERSIONS = 30;

/** Record files: with MySQL these were imported once and are no longer read. */
const RECORD_FILES = ["certificates", "enrollments", "assessments", "payments", "notifications", "users", "portals", "admin"];

export class ContentError extends Error {
  constructor(message: string, public problems: string[] = []) {
    super(message);
  }
}

export async function listDefs(): Promise<ContentDef[]> {
  let pages: string[] = [];
  try {
    pages = (await fs.readdir(path.join(DATA_DIR, "pages"))).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)).sort();
  } catch {}
  return [...CONTENT, ...pages.map(pageDef)];
}

export async function getDef(key: string) {
  return (await listDefs()).find((d) => d.key === key) ?? null;
}

const fileOf = (name: string) => path.join(DATA_DIR, `${name}.json`);
const versionOf = (text: string) => createHash("sha256").update(text).digest("hex").slice(0, 16);

export async function loadContent<T = unknown>(file: string): Promise<{ data: T; version: string }> {
  const text = await fs.readFile(fileOf(file), "utf8");
  return { data: JSON.parse(text) as T, version: versionOf(text) };
}

/** One save at a time per file within this server process. */
const queues = new Map<string, Promise<unknown>>();
function serialized<T>(file: string, fn: () => Promise<T>): Promise<T> {
  const run = (queues.get(file) ?? Promise.resolve()).then(fn, fn);
  queues.set(file, run.catch(() => {}));
  return run;
}

export function imageExists(src: string) {
  const rel = decodeURIComponent(src.split("?")[0]);
  const full = rel.startsWith("/uploads/") ? path.join(DATA_DIR, rel) : path.join(PUBLIC_DIR, rel);
  return full.startsWith(DATA_DIR) || full.startsWith(PUBLIC_DIR) ? existsSync(full) : false;
}

async function allContent() {
  const out: Record<string, unknown> = {};
  const skip = hasDatabase() ? RECORD_FILES : [];
  for (const f of await fs.readdir(DATA_DIR, { recursive: true })) {
    const name = String(f).replace(/\\/g, "/");
    if (!name.endsWith(".json") || name.startsWith(".history") || name.startsWith("uploads") || name === "site-settings.json") continue;
    const key = name.slice(0, -5);
    if (skip.includes(key)) continue;
    try {
      out[key] = JSON.parse(await fs.readFile(path.join(DATA_DIR, name), "utf8"));
    } catch {}
  }
  return out;
}

/** Problems the new content would introduce (problems that already existed don't block a save). */
async function validate(file: string, next: unknown) {
  const current = await allContent();
  const before = new Set(checkContent(current, imageExists).errors);
  const after = checkContent({ ...current, [file]: next }, imageExists).errors;
  return after.filter((e) => !before.has(e));
}

export async function saveContent(file: string, next: unknown, opts: { version: string; savedBy: string }) {
  return serialized(file, async () => {
    const currentText = await fs.readFile(fileOf(file), "utf8");
    if (versionOf(currentText) !== opts.version) {
      throw new ContentError("Someone else saved this content after you opened it. Reload the page to see their changes, then make yours again.");
    }
    const problems = await validate(file, next);
    if (problems.length) throw new ContentError("Not saved — please fix these problems:", problems);

    const text = JSON.stringify(next, null, 2) + "\n";
    const dir = path.join(HISTORY_DIR, file);
    await fs.mkdir(dir, { recursive: true });
    // The first save keeps the version that was there before the editor was ever used
    if (!(await fs.readdir(dir)).length) await fs.writeFile(path.join(dir, `${stamp(new Date(0))}__original.json`), currentText);
    await writeAtomic(fileOf(file), text);
    await fs.writeFile(path.join(dir, `${stamp(new Date())}__${encodeURIComponent(opts.savedBy)}.json`), text);
    await prune(dir);
    return { version: versionOf(text) };
  });
}

async function writeAtomic(target: string, text: string) {
  const tmp = `${target}.${randomBytes(4).toString("hex")}.tmp`;
  await fs.writeFile(tmp, text, "utf8");
  await fs.rename(tmp, target);
}

const stamp = (d: Date) => d.toISOString().replace(/[:.]/g, "-");

async function prune(dir: string) {
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".json") && !f.includes("__original")).sort();
  for (const f of files.slice(0, Math.max(0, files.length - KEEP_VERSIONS))) await fs.unlink(path.join(dir, f)).catch(() => {});
}

export interface HistoryEntry {
  id: string;
  savedAt: string | null;
  savedBy: string;
}

export async function listHistory(file: string): Promise<HistoryEntry[]> {
  let names: string[] = [];
  try {
    names = await fs.readdir(path.join(HISTORY_DIR, file));
  } catch {
    return [];
  }
  return names
    .filter((n) => n.endsWith(".json"))
    .sort()
    .reverse()
    .map((n) => {
      const [ts, who] = n.slice(0, -5).split("__");
      const iso = ts.replace(/^(\d{4}-\d{2}-\d{2}T\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/, "$1:$2:$3.$4Z");
      const original = who === "original";
      return { id: n.slice(0, -5), savedAt: original ? null : iso, savedBy: original ? "Before the first edit" : decodeURIComponent(who ?? "") };
    });
}

export async function readHistory(file: string, id: string) {
  if (!/^[\w%.@+-]+$/.test(id)) throw new ContentError("Unknown version.");
  try {
    return JSON.parse(await fs.readFile(path.join(HISTORY_DIR, file, `${id}.json`), "utf8")) as unknown;
  } catch {
    throw new ContentError("That version no longer exists.");
  }
}

/* Uploaded images ------------------------------------------------------------ */

const IMAGE_TYPES: Record<string, { ext: string; magic?: (b: Buffer) => boolean }> = {
  "image/png": { ext: "png", magic: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  "image/jpeg": { ext: "jpg", magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  "image/webp": { ext: "webp", magic: (b) => b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP" },
  "image/gif": { ext: "gif", magic: (b) => b.subarray(0, 4).toString() === "GIF8" },
  "image/svg+xml": { ext: "svg", magic: (b) => /<svg[\s>]/i.test(b.subarray(0, 4096).toString("utf8")) },
};
export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

/** Saves an uploaded image under data/uploads/<folder>/ and returns its public URL. */
export async function saveUpload(file: File, folder: string) {
  const type = IMAGE_TYPES[file.type];
  if (!type) throw new ContentError("Use a PNG, JPG, WebP, GIF or SVG image.");
  if (file.size > MAX_UPLOAD_BYTES) throw new ContentError("The image is larger than 3 MB — please use a smaller file.");
  const bytes = Buffer.from(await file.arrayBuffer());
  if (type.magic && !type.magic(bytes)) throw new ContentError("That file doesn't look like the image type it claims to be.");
  const safeFolder = folder.replace(/[^a-z0-9-]/gi, "").toLowerCase() || "misc";
  const base = file.name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "image";
  const name = `${base}-${createHash("sha256").update(bytes).digest("hex").slice(0, 8)}.${type.ext}`;
  await fs.mkdir(path.join(UPLOAD_DIR, safeFolder), { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, safeFolder, name), bytes);
  return `/uploads/${safeFolder}/${name}`;
}

export const UPLOAD_CONTENT_TYPES: Record<string, string> = Object.fromEntries(Object.entries(IMAGE_TYPES).map(([mime, t]) => [t.ext, mime]));
