import { existsSync, promises as fs } from "node:fs";
import path from "node:path";

/** Copies files from data-initial/ into data/ when they don't exist there yet. */
export async function seedContent() {
  const from = path.join(process.cwd(), "data-initial");
  const to = path.join(process.cwd(), "data");
  if (!existsSync(from)) return; // local development: data/ is the source
  let added = 0;
  for (const rel of await fs.readdir(from, { recursive: true })) {
    const src = path.join(from, String(rel));
    const dest = path.join(to, String(rel));
    if ((await fs.stat(src)).isDirectory() || existsSync(dest)) continue;
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(src, dest);
    added++;
  }
  if (added) console.log(`[content] added ${added} new content file(s) to data/`);
}
