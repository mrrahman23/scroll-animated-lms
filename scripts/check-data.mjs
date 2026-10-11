#!/usr/bin/env node
/**
 * Validates the JSON content in /data: syntax, required fields and cross-references.
 * The rules live in src/lib/content-rules.mjs and are also applied when an admin saves content.
 * Run: npm run check-data
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { checkContent } from "../src/lib/content-rules.mjs";

const DATA = path.join(process.cwd(), "data");
const PUBLIC = path.join(process.cwd(), "public");
const errors = [];
const files = {};

// 1. Every .json file parses (the admin's version history and uploads are skipped)
for (const f of readdirSync(DATA, { recursive: true })) {
  if (!f.endsWith(".json") || f.startsWith(".history") || f.startsWith("uploads")) continue;
  try {
    files[f.replace(/\\/g, "/").replace(/\.json$/, "")] = JSON.parse(readFileSync(path.join(DATA, f), "utf8"));
  } catch (e) {
    errors.push(`${f}: ${e.message}`);
  }
}
for (const f of ["categories", "instructors", "courses", "partners", "site"]) if (!(f in files) && !errors.some((e) => e.startsWith(f))) errors.push(`${f}.json: file is missing`);

// 2. Content rules
const imageExists = (src) => {
  const rel = decodeURIComponent(src.split("?")[0]);
  return rel.startsWith("/uploads/") ? existsSync(path.join(DATA, rel)) : existsSync(path.join(PUBLIC, rel));
};
const result = checkContent(files, imageExists);
errors.push(...result.errors);

result.warnings.forEach((w) => console.log(`  ⚠ ${w}`));
if (errors.length) {
  errors.forEach((e) => console.error(`  ✗ ${e}`));
  console.error(`\n${errors.length} problem(s) found in /data.`);
  process.exit(1);
}
console.log(`✓ /data looks good — ${files.courses.length} courses, ${files.partners.length} partners, ${(files.certificates ?? []).length} certificates.`);
