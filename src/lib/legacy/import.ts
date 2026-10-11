import "server-only";
import { eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import * as t from "@/lib/db/schema";
import { loadContent, saveContent } from "@/lib/content-admin/store";
import type { Partner } from "@/types";
import { parseDump, type DumpRow } from "./sql-dump";

/**
 * Imports results from the old verification system (verify.nytibd.com, tables
 * `students`, `results`, `courses`) as certificates with a mark sheet.
 *
 * - Certificate ID: NYTI-{roll}-{reg} — the same on every run, so re-importing a newer export
 *   updates the existing certificates instead of duplicating them.
 * - Status is never changed by a re-import (a certificate revoked here stays revoked).
 * - Not imported: date of birth, religion, gender.
 */

const MAP_KEY = "legacy_institute_map";
const NYTI = "nyti";

export type InstituteChoice = { type: "nyti" } | { type: "partner"; id: string } | { type: "new"; name: string };

export interface ImportPreview {
  students: number;
  subjects: number;
  courses: number;
  skippedSubjects: number;
  withoutSubjects: { id: number; name: string }[];
  sharedRegNumbers: { regNo: string; students: string[] }[];
  alreadyImported: number;
  institutes: { key: string; names: string[]; count: number; choice: InstituteChoice }[];
  partners: { id: string; name: string }[];
}

type Parsed = { students: DumpRow[]; results: DumpRow[]; courses: DumpRow[] };

export function parseLegacy(sqlText: string): Parsed {
  const d = parseDump(sqlText, ["students", "results", "courses"]);
  if (!d.students.length) throw new Error("No `students` rows found. Export the old database (Export → SQL) including the students, results and courses tables.");
  return { students: d.students, results: d.results, courses: d.courses };
}

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());
export const legacyCertificateId = (s: DumpRow) => `NYTI-${str(s.roll_no)}-${str(s.reg_no)}`.toUpperCase();
const instituteKey = (name: string) => {
  const k = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  return k.includes("nationalyouthtraininginstitute") ? NYTI : k;
};
const active = (r: DumpRow) => r.status === null || r.status === undefined || Number(r.status) === 1;

async function savedMap(): Promise<Record<string, InstituteChoice>> {
  const [row] = await db().select().from(t.appMeta).where(eq(t.appMeta.key, MAP_KEY)).limit(1);
  try {
    return row ? JSON.parse(row.value) : {};
  } catch {
    return {};
  }
}

export async function previewLegacy(sqlText: string): Promise<ImportPreview> {
  const p = parseLegacy(sqlText);
  const students = p.students.filter(active);
  const { data: partners } = await loadContent<Partner[]>("partners");
  const saved = await savedMap();

  const groups = new Map<string, { names: Map<string, number>; count: number }>();
  for (const s of students) {
    const name = str(s.institute) || "National Youth Training Institute";
    const key = instituteKey(name);
    const g = groups.get(key) ?? { names: new Map(), count: 0 };
    g.names.set(name, (g.names.get(name) ?? 0) + 1);
    g.count++;
    groups.set(key, g);
  }
  const institutes = [...groups].map(([key, g]) => {
    const names = [...g.names.keys()].sort((a, b) => g.names.get(b)! - g.names.get(a)!);
    const match = partners.find((x) => instituteKey(x.name) === key);
    const remembered = saved[key];
    const choice: InstituteChoice =
      remembered && (remembered.type !== "partner" || partners.some((x) => x.id === remembered.id))
        ? remembered
        : key === NYTI
          ? { type: "nyti" }
          : match
            ? { type: "partner", id: match.id }
            : { type: "new", name: names[0] };
    return { key, names, count: g.count, choice };
  });

  const ids = new Set(students.map((s) => Number(s.id)));
  const counted = new Set(p.results.filter((r) => active(r) && ids.has(Number(r.student_id))).map((r) => Number(r.student_id)));
  const byReg = new Map<string, string[]>();
  for (const s of students) byReg.set(str(s.reg_no), [...(byReg.get(str(s.reg_no)) ?? []), `${str(s.name)} (roll ${str(s.roll_no)})`]);
  const existing = await db().select({ id: t.certificateDetails.legacyStudentId }).from(t.certificateDetails).where(isNotNull(t.certificateDetails.legacyStudentId));
  const existingIds = new Set(existing.map((e) => e.id));

  return {
    students: students.length,
    subjects: p.results.filter((r) => active(r) && ids.has(Number(r.student_id))).length,
    courses: p.courses.length,
    skippedSubjects: p.results.filter((r) => !active(r)).length,
    withoutSubjects: students.filter((s) => !counted.has(Number(s.id))).map((s) => ({ id: Number(s.id), name: str(s.name) })),
    sharedRegNumbers: [...byReg].filter(([, v]) => v.length > 1).map(([regNo, v]) => ({ regNo, students: v })),
    alreadyImported: students.filter((s) => existingIds.has(Number(s.id))).length,
    institutes,
    partners: partners.map((x) => ({ id: x.id, name: x.name })),
  };
}

const slugify = (s: string) => s.toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
const acronym = (s: string) => s.match(/\(([^)]+)\)/)?.[1] ?? s.split(/\s+/).filter((w) => /^[A-Z]/.test(w)).map((w) => w[0]).join("").slice(0, 8);

/** Adds partners chosen as "new" to partners.json; returns institute key → partner id (null = NYTI). */
async function resolveInstitutes(choices: Record<string, InstituteChoice>, firstYear: Record<string, number>, actor: string) {
  const { data: partners, version } = await loadContent<Partner[]>("partners");
  const result: Record<string, string | null> = {};
  const added: Partner[] = [];
  for (const [key, c] of Object.entries(choices)) {
    if (c.type === "nyti") result[key] = null;
    else if (c.type === "partner") {
      if (!partners.some((x) => x.id === c.id)) throw new Error("A chosen partner no longer exists — reload the page.");
      result[key] = c.id;
    } else {
      const name = c.name.trim();
      if (!name) throw new Error("Enter a name for each new partner.");
      const same = [...partners, ...added].find((x) => x.name.toLowerCase() === name.toLowerCase());
      if (same) {
        result[key] = same.id;
        continue;
      }
      let slug = slugify(name) || "partner";
      while ([...partners, ...added].some((x) => x.slug === slug)) slug += "-2";
      const partner: Partner = {
        id: `p-${slug}`.slice(0, 60),
        slug,
        name,
        shortName: acronym(name) || name.slice(0, 12),
        logo: "",
        type: "Training Center",
        city: "",
        district: "",
        address: "",
        phone: "",
        email: "",
        website: "",
        authorizationNumber: "",
        // Pending until an admin completes the profile; certificates show the name either way
        status: "pending",
        since: firstYear[key] ?? new Date().getFullYear(),
        modes: ["offline"],
        categoryIds: [],
        courseIds: [],
        facilities: [],
        certificatesIssued: 0,
        studentsTrained: 0,
        description: "Imported from the previous NYTI verification system. Complete this profile and set the status to active to list it publicly.",
      };
      added.push(partner);
      result[key] = partner.id;
    }
  }
  if (added.length) await saveContent("partners", [...partners, ...added], { version, savedBy: actor });
  return { map: result, created: added.map((x) => x.name) };
}

export async function runLegacyImport(sqlText: string, choices: Record<string, InstituteChoice>, actor: string, siteName: string) {
  const p = parseLegacy(sqlText);
  const students = p.students.filter(active);
  const courseName = new Map(p.courses.map((c) => [str(c.id), str(c.name)]));

  const firstYear: Record<string, number> = {};
  for (const s of students) {
    const key = instituteKey(str(s.institute) || "National Youth Training Institute");
    const y = Number(str(s.created_at).slice(0, 4));
    if (y && (!firstYear[key] || y < firstYear[key])) firstYear[key] = y;
  }
  for (const s of students) {
    const key = instituteKey(str(s.institute) || "National Youth Training Institute");
    if (!choices[key]) throw new Error(`Choose who issued the certificates for "${str(s.institute)}".`);
  }
  const { map, created } = await resolveInstitutes(choices, firstYear, actor);
  const { data: partners } = await loadContent<Partner[]>("partners");
  const partnerName = new Map(partners.map((x) => [x.id, x.name]));

  const subjectsByStudent = new Map<number, DumpRow[]>();
  for (const r of p.results) if (active(r)) subjectsByStudent.set(Number(r.student_id), [...(subjectsByStudent.get(Number(r.student_id)) ?? []), r]);

  const certIds = students.map(legacyCertificateId);
  const existing = new Set((await db().select({ id: t.certificates.id }).from(t.certificates).where(inArray(t.certificates.id, certIds))).map((r) => r.id));
  let inserted = 0;
  let updated = 0;
  let subjects = 0;

  await db().transaction(async (tx) => {
    for (const s of students) {
      const id = legacyCertificateId(s);
      const key = instituteKey(str(s.institute) || "National Youth Training Institute");
      const partnerId = map[key] ?? null;
      const cgpa = s.cgpa === null || s.cgpa === "" ? null : Number(s.cgpa).toFixed(2);
      const course = str(s.course_name) || courseName.get(str(s.course)) || "Course";
      const values = {
        holderName: str(s.name).slice(0, 191) || "Unknown",
        courseId: `legacy-${str(s.course) || "0"}`,
        courseTitle: course.slice(0, 255),
        issuedByPartnerId: partnerId,
        issuedByName: (partnerId ? partnerName.get(partnerId) ?? str(s.institute) : siteName).slice(0, 191),
        grade: cgpa,
        mode: "offline" as const,
      };
      if (existing.has(id)) {
        await tx.update(t.certificates).set(values).where(eq(t.certificates.id, id));
        updated++;
      } else {
        await tx.insert(t.certificates).values({ id, ...values, issueDate: str(s.created_at).slice(0, 10) || new Date().toISOString().slice(0, 10), status: "valid", hours: 0 });
        await tx.insert(t.certificateEvents).values({ certificateId: id, action: "imported", reason: `Imported from the previous verification system (student #${s.id})`, actor });
        inserted++;
      }

      const details = {
        legacyStudentId: Number(s.id),
        rollNo: str(s.roll_no) || null,
        regNo: str(s.reg_no) || null,
        fatherName: str(s.fname).slice(0, 191) || null,
        motherName: str(s.mname).slice(0, 191) || null,
        studentType: str(s.student_type) === "1" ? "Regular" : str(s.student_type) === "2" ? "Irregular" : str(s.student_type) || null,
        institute: str(s.institute).slice(0, 255) || null,
        courseDuration: str(s.course_duration).slice(0, 100) || null,
        batch: str(s.batch).slice(0, 100) || null,
        cgpa,
        photo: str(s.image) || null,
        scan: str(s.certificate) || null,
      };
      const [prev] = await tx.select().from(t.certificateDetails).where(eq(t.certificateDetails.certificateId, id)).limit(1);
      if (prev) {
        // Keep images already copied to this site when the old path hasn't changed
        const keep = (old: string | null, next: string | null) => (old && next && old.startsWith("/uploads/legacy/") && old.endsWith(next) ? old : next);
        await tx.update(t.certificateDetails).set({ ...details, photo: keep(prev.photo, details.photo), scan: keep(prev.scan, details.scan) }).where(eq(t.certificateDetails.certificateId, id));
      } else {
        await tx.insert(t.certificateDetails).values({ certificateId: id, ...details });
      }

      await tx.delete(t.certificateSubjects).where(eq(t.certificateSubjects.certificateId, id));
      const rows = (subjectsByStudent.get(Number(s.id)) ?? [])
        .map((r) => ({ r, semester: Math.max(0, Number(r.session_code ?? 1) - 1) }))
        .sort((a, b) => a.semester - b.semester || Number(a.r.id) - Number(b.r.id));
      if (rows.length) {
        await tx.insert(t.certificateSubjects).values(
          rows.map(({ r, semester }, i) => ({
            certificateId: id,
            semester,
            code: str(r.subject_code).replace(/[^\w.-]/g, "").slice(0, 32) || null,
            name: str(r.subject_name).replace(/\s+/g, " ").slice(0, 255) || "Subject",
            grade: str(r.gl).slice(0, 8) || null,
            gradePoint: str(r.gp).slice(0, 8) || null,
            marks: str(r.marks).slice(0, 8) || null,
            sort: i,
          })),
        );
        subjects += rows.length;
      }
    }
    // Remember the outcome (a partner created now is chosen next time, not created again)
    const remembered = JSON.stringify(Object.fromEntries(Object.entries(map).map(([k, id]) => [k, id ? { type: "partner", id } : { type: "nyti" }])));
    await tx.insert(t.appMeta).values({ key: MAP_KEY, value: remembered }).onDuplicateKeyUpdate({ set: { value: remembered, updatedAt: new Date() } });
  });

  return { inserted, updated, subjects, partnersCreated: created };
}

/* Old courses → catalogue courses with subjects ------------------------------------------- */

export async function previewLegacyCourses(sqlText: string) {
  const { planLegacyCourses } = await import("./courses");
  const p = parseLegacy(sqlText);
  const [{ data: courses }, { data: categories }] = await Promise.all([loadContent<import("@/types").Course[]>("courses"), loadContent<import("@/types").Category[]>("categories")]);
  return planLegacyCourses(p, courses, categories).plans;
}

/**
 * Adds the old courses that aren't in the catalogue yet (existing ones are never overwritten),
 * and lets each partner enter results for the courses its students took.
 */
export async function addLegacyCourses(sqlText: string, actor: string) {
  const { planLegacyCourses } = await import("./courses");
  const p = parseLegacy(sqlText);
  const [{ data: courses, version }, { data: categories }] = await Promise.all([loadContent<import("@/types").Course[]>("courses"), loadContent<import("@/types").Category[]>("categories")]);
  const { courses: added } = planLegacyCourses(p, courses, categories);
  if (added.length) await saveContent("courses", [...courses, ...added], { version, savedBy: actor });

  // Partner → courses its students were in (using the institute choices from the import)
  const saved = await savedMap();
  const offered = new Map<string, Set<string>>();
  for (const s of p.students.filter(active)) {
    const choice = saved[instituteKey(str(s.institute) || "National Youth Training Institute")];
    if (choice?.type !== "partner") continue;
    offered.set(choice.id, (offered.get(choice.id) ?? new Set()).add(`legacy-${str(s.course)}`));
  }
  const { data: allCourses } = await loadContent<import("@/types").Course[]>("courses");
  const courseIds = new Set(allCourses.map((c) => c.id));
  const { data: partners, version: pv } = await loadContent<Partner[]>("partners");
  let partnersUpdated = 0;
  const next = partners.map((x) => {
    const want = [...(offered.get(x.id) ?? [])].filter((id) => courseIds.has(id) && !x.courseIds.includes(id));
    if (!want.length) return x;
    partnersUpdated++;
    const cats = allCourses.filter((c) => want.includes(c.id)).map((c) => c.categoryId);
    return { ...x, courseIds: [...x.courseIds, ...want], categoryIds: [...new Set([...x.categoryIds, ...cats])] };
  });
  if (partnersUpdated) await saveContent("partners", next, { version: pv, savedBy: actor });
  return { added: added.length, withSubjects: added.filter((c) => c.subjects?.length).length, partnersUpdated };
}
