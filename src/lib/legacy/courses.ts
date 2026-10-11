import "server-only";
import type { Category, Course, CourseSubject } from "@/types";
import type { DumpRow } from "./sql-dump";

/**
 * Turns the old system's `courses` table into catalogue courses with mark-sheet subjects.
 * - ID `legacy-{old id}`: certificates imported earlier already point at these IDs.
 * - Subjects come from the most recent student of that course (the current syllabus).
 * - Hidden from the public catalogue and offline-only; everything else is a sensible default
 *   to complete later in Admin → Courses.
 */
const str = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());
const slugify = (s: string) => s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

const CATEGORY_RULES: [RegExp, string][] = [
  [/office (application|management)|computer office/i, "cat-office"],
  [/graphic/i, "cat-gd"],
  [/hotel|tourism/i, "cat-hosp"],
  [/medical|pharmacy|midwifery|nursing|dental|radiology|family planning/i, "cat-health"],
  [/english|phonetics|language/i, "cat-lang"],
  [/accounting|finance/i, "cat-fin"],
  [/business|library/i, "cat-biz"],
  [/computer|web|software|mobile phone|telecom/i, "cat-it"],
];

export function guessCategory(name: string, categories: Category[]) {
  const ids = new Set(categories.map((c) => c.id));
  const hit = CATEGORY_RULES.find(([re, id]) => re.test(name) && ids.has(id));
  return hit?.[1] ?? (ids.has("cat-tech") ? "cat-tech" : categories[0]?.id ?? "");
}

/** "(6 Month)", "(4 Year)", "18 Month", "1 Year" → weeks */
export function durationWeeks(...texts: string[]) {
  for (const t of texts) {
    const m = t.match(/(\d+)\s*(month|year)/i);
    if (m) return m[2].toLowerCase() === "year" ? Number(m[1]) * 52 : Math.round(Number(m[1]) * 4.33);
  }
  return 26;
}

export interface LegacyCoursePlan {
  id: string;
  title: string;
  subjects: number;
  students: number;
  exists: boolean;
}

export function planLegacyCourses(p: { students: DumpRow[]; results: DumpRow[]; courses: DumpRow[] }, existing: Course[], categories: Category[]) {
  const active = (r: DumpRow) => r.status === null || r.status === undefined || Number(r.status) === 1;
  const students = p.students.filter(active);
  const results = p.results.filter(active);
  const have = new Set(existing.map((c) => c.id));
  const slugs = new Set(existing.map((c) => c.slug));
  const iconOf = (catId: string) => categories.find((c) => c.id === catId)?.icon ?? "school";

  const plans: LegacyCoursePlan[] = [];
  const courses: Course[] = [];
  for (const row of p.courses) {
    const oldId = str(row.id);
    const id = `legacy-${oldId}`;
    const title = str(row.name) || `Course ${oldId}`;
    const inCourse = students.filter((s) => str(s.course) === oldId);
    // Latest student who has results = the syllabus currently in use
    const latest = [...inCourse].sort((a, b) => str(b.created_at).localeCompare(str(a.created_at))).find((s) => results.some((r) => Number(r.student_id) === Number(s.id)));
    const seen = new Set<string>();
    const subjects: CourseSubject[] = [];
    if (latest) {
      const rows = results
        .filter((r) => Number(r.student_id) === Number(latest.id))
        .sort((a, b) => Number(a.session_code ?? 1) - Number(b.session_code ?? 1) || Number(a.id) - Number(b.id));
      for (const r of rows) {
        const name = str(r.subject_name).replace(/\s+/g, " ");
        const semester = Math.max(0, Number(r.session_code ?? 1) - 1);
        const key = `${semester}|${name.toLowerCase()}`;
        if (!name || seen.has(key)) continue;
        seen.add(key);
        subjects.push({ id: `${id}-s${subjects.length + 1}`, semester, code: str(r.subject_code).replace(/[^\w.-]/g, ""), name, fullMarks: 100 });
      }
    }
    plans.push({ id, title, subjects: subjects.length, students: inCourse.length, exists: have.has(id) });
    if (have.has(id)) continue;

    let slug = slugify(title) || id;
    while (slugs.has(slug)) slug = `${slug}-${oldId}`;
    slugs.add(slug);
    const categoryId = guessCategory(title, categories);
    courses.push({
      id,
      slug,
      title,
      shortDescription: `Offline programme delivered at NYTI and authorized training centres.`,
      description: `${title}. Results and certificates for this programme are issued by NYTI and can be verified online by certificate ID or by registration and roll number.`,
      image: "",
      imageAlt: "",
      categoryId,
      instructorId: "",
      modes: ["offline"],
      level: "All Levels",
      durationWeeks: durationWeeks(title, str(row.duration)),
      hoursPerWeek: 0,
      language: "Bangla & English",
      students: inCourse.length,
      rating: 0,
      reviewCount: 0,
      price: Number(str(row.fee).replace(/[^\d.]/g, "")) || 0,
      certificate: true,
      featured: false,
      nextIntake: "",
      outcomes: [],
      requirements: [],
      partnerIds: [],
      thumbnail: { hue: "navy", icon: iconOf(categoryId) },
      curriculum: [],
      subjects,
      hidden: true,
    });
  }
  return { plans, courses };
}
