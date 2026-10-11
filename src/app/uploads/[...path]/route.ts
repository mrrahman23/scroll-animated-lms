import { promises as fs } from "node:fs";
import path from "node:path";
import { UPLOAD_CONTENT_TYPES, UPLOAD_DIR } from "@/lib/content-admin/store";

/**
 * Serves images uploaded from the admin (data/uploads/…). They live in /data rather than /public
 * because Next.js only serves /public files that existed when the site was built.
 */
export async function GET(_req: Request, { params }: RouteContext<"/uploads/[...path]">) {
  const parts = (await params).path;
  const full = path.join(UPLOAD_DIR, ...parts);
  const ext = path.extname(full).slice(1).toLowerCase();
  const type = UPLOAD_CONTENT_TYPES[ext === "jpeg" ? "jpg" : ext];
  if (!type || !full.startsWith(UPLOAD_DIR + path.sep) || parts.some((p) => p.startsWith("."))) return new Response("Not found", { status: 404 });
  let body: Buffer;
  try {
    body = await fs.readFile(full);
  } catch {
    return new Response("Not found", { status: 404 });
  }
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": type,
      // File names include a content hash, so a changed image gets a new URL
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      // An uploaded SVG opened directly can't run scripts on this site
      "Content-Security-Policy": "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox",
    },
  });
}
