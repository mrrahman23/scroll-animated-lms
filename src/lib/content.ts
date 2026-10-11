import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

/**
 * Reads the editable JSON files in /data (server only).
 * Pages re-read them on revalidation (see `revalidate` in app/layout.tsx),
 * so editing a JSON file updates the live site without a rebuild.
 */
const DATA_DIR = path.join(process.cwd(), "data");

const readRaw = cache(async (file: string): Promise<unknown> => {
  const rel = `data/${file}.json`;
  let text: string;
  try {
    text = await readFile(path.join(DATA_DIR, `${file}.json`), "utf8");
  } catch {
    throw new Error(`Missing content file: ${rel}`);
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    // Surface the file name so a typo in hand-edited JSON is easy to find
    throw new Error(`Invalid JSON in ${rel}: ${(e as Error).message}`);
  }
});

export async function readData<T>(file: string): Promise<T> {
  return (await readRaw(file)) as T;
}
