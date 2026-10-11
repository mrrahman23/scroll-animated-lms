import "server-only";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { getCourses, getGrading, getPartners, getSite } from "@/lib/api";
import { db } from "@/lib/db/client";
import * as t from "@/lib/db/schema";
import type { Course, CourseSubject } from "@/types";
import { gradeCell, summarize, GradeError, type Cell } from "@/lib/grading";
import { nextCertificateId, type Tx } from "./certificates";
import { notify } from "./notify";

/**
 * Results entry: a batch of students for one course, with a mark per subject.
 * NYTI admins publish directly; partner batches go draft → submitted → (admin) published.
 * Publishing issues each passing student's certificate with its mark sheet.
 */

export interface Viewer {
  id: string;
  role: string;
  partnerId?: string;
}
export class ResultsError extends Error {}
export { gradeCell, summarize, type Cell } from "@/lib/grading";

/* Batches --------------------------------------------------------------------------- */

async function courseOf(courseId: string) {
  const course = (await getCourses()).find((c) => c.id === courseId);
  if (!course) throw new ResultsError("This course no longer exists.");
  return course;
}
const subjectsOf = (c: Course) => [...(c.subjects ?? [])].sort((a, b) => a.semester - b.semester);

async function batchFor(id: number, viewer: Viewer) {
  const [b] = await db().select().from(t.resultBatches).where(eq(t.resultBatches.id, id)).limit(1);
  if (!b) throw new ResultsError("This batch doesn't exist.");
  if (viewer.role !== "admin" && (viewer.role !== "partner" || !viewer.partnerId || b.partnerId !== viewer.partnerId)) throw new ResultsError("Not allowed.");
  return b;
}

export async function listBatches(viewer: Viewer) {
  const where = viewer.role === "admin" ? undefined : eq(t.resultBatches.partnerId, viewer.partnerId ?? "-");
  const batches = await db().select().from(t.resultBatches).where(where).orderBy(desc(t.resultBatches.updatedAt));
  const ids = batches.map((b) => b.id);
  const counts = ids.length
    ? await db()
        .select({ batchId: t.batchStudents.batchId, n: sql<number>`count(*)`, issued: sql<number>`sum(${t.batchStudents.certificateId} is not null)` })
        .from(t.batchStudents)
        .where(inArray(t.batchStudents.batchId, ids))
        .groupBy(t.batchStudents.batchId)
    : [];
  const [courses, partners] = await Promise.all([getCourses(), getPartners({ includePending: true })]);
  return batches.map((b) => {
    const c = counts.find((x) => x.batchId === b.id);
    return {
      ...b,
      courseTitle: courses.find((x) => x.id === b.courseId)?.title ?? b.courseId,
      issuer: b.partnerId ? partners.find((p) => p.id === b.partnerId)?.name ?? b.partnerId : "NYTI",
      students: Number(c?.n ?? 0),
      issued: Number(c?.issued ?? 0),
    };
  });
}

export async function createBatch(input: { courseId: string; name: string; courseDuration?: string; partnerId?: string | null }, viewer: Viewer) {
  const course = await courseOf(input.courseId);
  if (!subjectsOf(course).length) throw new ResultsError(`"${course.title}" has no subjects yet. Add them in Courses → ${course.title} → Mark sheet subjects.`);
  const name = input.name.trim();
  if (!name) throw new ResultsError("Enter a batch name, e.g. Jan–Jun 2026.");
  const partnerId = viewer.role === "admin" ? input.partnerId || null : viewer.partnerId;
  if (viewer.role !== "admin" && !partnerId) throw new ResultsError("Your account isn't linked to a partner.");
  const [r] = await db()
    .insert(t.resultBatches)
    .values({ courseId: course.id, name: name.slice(0, 120), courseDuration: input.courseDuration?.trim().slice(0, 100) || null, partnerId, createdBy: viewer.id })
    .$returningId();
  return r.id;
}

export async function getBatch(id: number, viewer: Viewer) {
  const batch = await batchFor(id, viewer);
  const course = await courseOf(batch.courseId);
  const students = await db().select().from(t.batchStudents).where(eq(t.batchStudents.batchId, id)).orderBy(t.batchStudents.sort, t.batchStudents.id);
  const marks = students.length ? await db().select().from(t.batchMarks).where(inArray(t.batchMarks.studentId, students.map((s) => s.id))) : [];
  return { batch, course, subjects: subjectsOf(course), students, marks, grading: await getGrading() };
}

export interface BatchStudentInput {
  id?: number;
  name: string;
  fatherName?: string;
  motherName?: string;
  rollNo?: string;
  regNo?: string;
  email?: string;
  studentType?: string;
  photo?: string;
  /** subjectId → marks or grade as typed */
  cells: Record<string, string>;
}

const clip = (v: string | undefined, n: number) => (v ?? "").trim().slice(0, n) || null;
const editable = (status: string, viewer: Viewer) => (viewer.role === "admin" ? true : status === "draft" || status === "rejected");

/** Saves the whole grid. Returns problems per student (rows are still saved where possible). */
export async function saveBatch(id: number, input: { name: string; courseDuration?: string; partnerId?: string | null; students: BatchStudentInput[] }, viewer: Viewer) {
  const batch = await batchFor(id, viewer);
  if (!editable(batch.status, viewer)) throw new ResultsError(batch.status === "submitted" ? "This batch is waiting for NYTI approval and can't be changed now." : "This batch can't be changed.");
  const course = await courseOf(batch.courseId);
  const subjects = subjectsOf(course);
  const grading = await getGrading();

  const problems: string[] = [];
  const rolls = new Map<string, string>();
  const rows = input.students
    .map((s, i) => ({ ...s, sort: i, name: s.name.trim() }))
    .filter((s) => s.name || Object.values(s.cells).some((v) => v.trim()));
  for (const s of rows) {
    if (!s.name) problems.push(`Row ${s.sort + 1}: enter the student's name.`);
    const roll = s.rollNo?.trim();
    if (roll) {
      if (rolls.has(roll)) problems.push(`Roll ${roll} is used for both ${rolls.get(roll)} and ${s.name}.`);
      rolls.set(roll, s.name);
    }
    if (s.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.email.trim())) problems.push(`${s.name}: "${s.email}" isn't a valid email.`);
  }
  const graded = rows.map((s) => {
    const cells: Record<string, Cell> = {};
    for (const sub of subjects) {
      try {
        const c = gradeCell(s.cells[sub.id] ?? "", sub, grading);
        if (c) cells[sub.id] = c;
      } catch (err) {
        problems.push(`${s.name || `Row ${s.sort + 1}`} — ${err instanceof GradeError ? err.message : "invalid value"}`);
      }
    }
    return { s, cells };
  });
  if (problems.length) return { ok: false as const, problems };

  const existing = await db().select().from(t.batchStudents).where(eq(t.batchStudents.batchId, id));
  const oldMarks = existing.length ? await db().select().from(t.batchMarks).where(inArray(t.batchMarks.studentId, existing.map((e) => e.id))) : [];
  // What an issued certificate shows for a student — used to update only certificates that changed
  const signature = (v: Record<string, unknown>, cells: Record<string, Cell>) =>
    JSON.stringify([
      ["name", "fatherName", "motherName", "rollNo", "regNo", "email", "studentType", "photo"].map((k) => v[k] ?? null),
      Object.entries(cells)
        .sort(([x], [y]) => x.localeCompare(y))
        .map(([k, c]) => [k, c.marks, c.grade, c.gradePoint]),
    ]);
  const oldSignature = new Map(
    existing.map((e) => [e.id, signature(e, Object.fromEntries(oldMarks.filter((m) => m.studentId === e.id).map((m) => [m.subjectId, { marks: m.marks, grade: m.grade, gradePoint: m.gradePoint }])))]),
  );
  const metaChanged = (input.name.trim() || batch.name) !== batch.name || clip(input.courseDuration, 100) !== batch.courseDuration;
  const keep = new Set(rows.map((r) => r.id).filter(Boolean));
  const removed = existing.filter((e) => !keep.has(e.id));
  if (removed.some((r) => r.certificateId)) throw new ResultsError(`${removed.filter((r) => r.certificateId).map((r) => r.name).join(", ")} already received a certificate and can't be removed. Revoke the certificate instead.`);
  const site = await getSite();
  const partner = batch.partnerId ? (await getPartners({ includePending: true })).find((p) => p.id === batch.partnerId) : undefined;
  const updatedCertificates: string[] = [];

  await db().transaction(async (tx) => {
    const newPartner = viewer.role === "admin" && input.partnerId !== undefined ? input.partnerId || null : batch.partnerId;
    await tx
      .update(t.resultBatches)
      .set({ name: input.name.trim().slice(0, 120) || batch.name, courseDuration: clip(input.courseDuration, 100), partnerId: batch.status === "published" ? batch.partnerId : newPartner, status: batch.status === "rejected" && viewer.role !== "admin" ? "draft" : batch.status })
      .where(eq(t.resultBatches.id, id));
    if (removed.length) {
      await tx.delete(t.batchMarks).where(inArray(t.batchMarks.studentId, removed.map((r) => r.id)));
      await tx.delete(t.batchStudents).where(inArray(t.batchStudents.id, removed.map((r) => r.id)));
    }
    for (const { s, cells } of graded) {
      const values = {
        name: s.name.slice(0, 191),
        fatherName: clip(s.fatherName, 191),
        motherName: clip(s.motherName, 191),
        rollNo: clip(s.rollNo, 32),
        regNo: clip(s.regNo, 32),
        email: clip(s.email, 191)?.toLowerCase() ?? null,
        studentType: clip(s.studentType, 32),
        photo: clip(s.photo, 255),
        sort: s.sort,
      };
      let sid = s.id && existing.some((e) => e.id === s.id) ? s.id : undefined;
      if (sid) await tx.update(t.batchStudents).set(values).where(eq(t.batchStudents.id, sid));
      else sid = (await tx.insert(t.batchStudents).values({ batchId: id, ...values }).$returningId())[0].id;
      await tx.delete(t.batchMarks).where(eq(t.batchMarks.studentId, sid));
      const list = Object.entries(cells).map(([subjectId, c]) => ({ studentId: sid!, subjectId, ...c }));
      if (list.length) await tx.insert(t.batchMarks).values(list);

      // Published already: keep the certificate's mark sheet in step with the correction
      const certId = existing.find((e) => e.id === sid)?.certificateId;
      if (certId && (metaChanged || oldSignature.get(sid) !== signature(values, cells))) {
        const sum = summarize(Object.values(cells), subjects.length, grading);
        await tx.update(t.certificates).set({ holderName: values.name, grade: sum.cgpa }).where(eq(t.certificates.id, certId));
        await writeDetails(tx, certId, values, { batch: { ...batch, name: input.name.trim() || batch.name, courseDuration: clip(input.courseDuration, 100) }, institute: partner?.name ?? site.name, cgpa: sum.cgpa }, subjects, cells, true);
        await tx.insert(t.certificateEvents).values({ certificateId: certId, action: "updated", reason: "Mark sheet updated", actor: viewer.id });
        updatedCertificates.push(certId);
      }
    }
  });
  return { ok: true as const, updatedCertificates: updatedCertificates.length };
}

async function writeDetails(
  tx: Tx,
  certId: string,
  s: { rollNo: string | null; regNo: string | null; fatherName: string | null; motherName: string | null; studentType: string | null; photo: string | null; email: string | null },
  ctx: { batch: { name: string; courseDuration: string | null }; institute: string; cgpa: string | null },
  subjects: CourseSubject[],
  cells: Record<string, Cell>,
  replace: boolean,
) {
  const details = {
    rollNo: s.rollNo,
    regNo: s.regNo,
    fatherName: s.fatherName,
    motherName: s.motherName,
    studentType: s.studentType || "Regular",
    institute: ctx.institute.slice(0, 255),
    courseDuration: ctx.batch.courseDuration,
    batch: ctx.batch.name.slice(0, 100),
    cgpa: ctx.cgpa,
    photo: s.photo,
    holderEmail: s.email,
  };
  if (replace) {
    await tx.update(t.certificateDetails).set(details).where(eq(t.certificateDetails.certificateId, certId));
    await tx.delete(t.certificateSubjects).where(eq(t.certificateSubjects.certificateId, certId));
  } else {
    await tx.insert(t.certificateDetails).values({ certificateId: certId, ...details });
  }
  const list = subjects
    .filter((sub) => cells[sub.id])
    .map((sub, i) => ({ certificateId: certId, semester: sub.semester, code: sub.code || null, name: sub.name.slice(0, 255), grade: cells[sub.id].grade, gradePoint: cells[sub.id].gradePoint, marks: cells[sub.id].marks, sort: i }));
  if (list.length) await tx.insert(t.certificateSubjects).values(list);
}

export async function submitBatch(id: number, viewer: Viewer) {
  const batch = await batchFor(id, viewer);
  if (viewer.role === "admin") throw new ResultsError("NYTI batches are published directly.");
  if (batch.status !== "draft" && batch.status !== "rejected") throw new ResultsError("This batch has already been submitted.");
  const n = await db().select({ id: t.batchStudents.id }).from(t.batchStudents).where(eq(t.batchStudents.batchId, id)).limit(1);
  if (!n.length) throw new ResultsError("Add students and their results before submitting.");
  await db().update(t.resultBatches).set({ status: "submitted", submittedAt: new Date(), reviewNote: null }).where(eq(t.resultBatches.id, id));
}

export async function rejectBatch(id: number, note: string, viewer: Viewer) {
  if (viewer.role !== "admin") throw new ResultsError("Not allowed.");
  const batch = await batchFor(id, viewer);
  if (batch.status !== "submitted") throw new ResultsError("Only submitted batches can be sent back.");
  if (!note.trim()) throw new ResultsError("Say what needs to change.");
  await db().update(t.resultBatches).set({ status: "rejected", reviewNote: note.trim().slice(0, 2000) }).where(eq(t.resultBatches.id, id));
  await notifyPartnerUsers(batch.partnerId, { title: "Results sent back for changes", body: `${batch.name}: ${note.trim()}`, href: `/partner-portal/results/${id}` });
}

async function notifyPartnerUsers(partnerId: string | null, n: { title: string; body: string; href: string }) {
  if (!partnerId) return;
  const users = await db().select({ id: t.users.id }).from(t.users).where(and(eq(t.users.partnerId, partnerId), eq(t.users.active, true)));
  for (const u of users) await notify(u.id, { ...n, type: "certificate", email: true });
}

const NUM = /^\d{3,10}$/;

/** Issues certificates for every complete, passing student who doesn't have one yet. */
export async function publishBatch(id: number, viewer: Viewer) {
  if (viewer.role !== "admin") throw new ResultsError("Only NYTI can publish results.");
  const { batch, course, subjects, students, marks, grading } = await getBatch(id, viewer);
  const site = await getSite();
  const partner = batch.partnerId ? (await getPartners({ includePending: true })).find((p) => p.id === batch.partnerId) : undefined;
  const issuer = partner?.name ?? site.name;
  const skipped: { name: string; reason: string }[] = [];
  const issued: { certId: string; userId: string | null; name: string }[] = [];

  const emails = students.map((s) => s.email).filter((e): e is string => !!e);
  const users = emails.length ? await db().select({ id: t.users.id, email: t.users.email }).from(t.users).where(inArray(t.users.email, emails)) : [];

  await db().transaction(async (tx) => {
    for (const s of students) {
      if (s.certificateId) continue;
      const cells = Object.fromEntries(marks.filter((m) => m.studentId === s.id).map((m) => [m.subjectId, { marks: m.marks, grade: m.grade, gradePoint: m.gradePoint }]));
      const sum = summarize(subjects.map((sub) => cells[sub.id]), subjects.length, grading);
      if (!sum.complete) {
        skipped.push({ name: s.name, reason: `results missing for ${subjects.length - sum.graded} subject(s)` });
        continue;
      }
      if (sum.failed) {
        skipped.push({ name: s.name, reason: `has a failing grade (${grading.failGrade})` });
        continue;
      }
      let certId: string;
      if (s.rollNo && s.regNo && NUM.test(s.rollNo) && NUM.test(s.regNo)) {
        certId = `NYTI-${s.rollNo}-${s.regNo}`;
        const [dupe] = await tx.select({ id: t.certificates.id }).from(t.certificates).where(eq(t.certificates.id, certId)).limit(1);
        if (dupe) {
          skipped.push({ name: s.name, reason: `certificate ${certId} already exists (roll/reg used before)` });
          continue;
        }
      } else certId = await nextCertificateId(tx, new Date().getFullYear());
      const userId = users.find((u) => u.email.toLowerCase() === (s.email ?? "").toLowerCase())?.id ?? null;
      await tx.insert(t.certificates).values({
        id: certId,
        holderName: s.name,
        holderUserId: userId,
        courseId: course.id,
        courseTitle: course.title,
        issuedByPartnerId: partner?.id ?? null,
        issuedByName: issuer.slice(0, 191),
        issueDate: new Date().toISOString().slice(0, 10),
        status: "valid",
        grade: sum.cgpa,
        mode: "offline",
        hours: course.durationWeeks * course.hoursPerWeek,
      });
      await writeDetails(tx, certId, s, { batch, institute: issuer, cgpa: sum.cgpa }, subjects, cells, false);
      await tx.insert(t.certificateEvents).values({ certificateId: certId, action: "issued", reason: `Results published — ${batch.name}`, actor: viewer.id });
      await tx.update(t.batchStudents).set({ certificateId: certId }).where(eq(t.batchStudents.id, s.id));
      issued.push({ certId, userId, name: s.name });
    }
    await tx.update(t.resultBatches).set({ status: "published", publishedAt: new Date(), publishedBy: viewer.id, reviewNote: null }).where(eq(t.resultBatches.id, id));
  });

  for (const i of issued) {
    if (i.userId) await notify(i.userId, { title: "Your certificate is ready", body: `${course.title}: certificate ${i.certId} and your mark sheet are now available.`, type: "certificate", href: `/dashboard/certificates/${i.certId}`, email: true });
  }
  if (batch.partnerId) await notifyPartnerUsers(batch.partnerId, { title: "Results published", body: `${batch.name}: ${issued.length} certificate(s) issued.`, href: `/partner-portal/results/${id}` });
  return { issued: issued.length, skipped };
}

export async function deleteBatch(id: number, viewer: Viewer) {
  const batch = await batchFor(id, viewer);
  const students = await db().select({ id: t.batchStudents.id, cert: t.batchStudents.certificateId }).from(t.batchStudents).where(eq(t.batchStudents.batchId, id));
  if (students.some((s) => s.cert)) throw new ResultsError("Certificates were issued from this batch, so it can't be deleted.");
  if (!editable(batch.status, viewer)) throw new ResultsError("This batch can't be deleted now.");
  await db().transaction(async (tx) => {
    if (students.length) await tx.delete(t.batchMarks).where(inArray(t.batchMarks.studentId, students.map((s) => s.id)));
    await tx.delete(t.batchStudents).where(eq(t.batchStudents.batchId, id));
    await tx.delete(t.resultBatches).where(eq(t.resultBatches.id, id));
  });
}

/* Linking certificates to student accounts ----------------------------------------------- */

/** On registration: certificates issued to this email join the new account. */
export async function linkCertificatesByEmail(userId: string, email: string) {
  const rows = await db()
    .select({ id: t.certificates.id })
    .from(t.certificates)
    .innerJoin(t.certificateDetails, eq(t.certificateDetails.certificateId, t.certificates.id))
    .where(and(eq(t.certificateDetails.holderEmail, email.toLowerCase()), isNull(t.certificates.holderUserId)));
  if (!rows.length) return 0;
  await db().update(t.certificates).set({ holderUserId: userId }).where(inArray(t.certificates.id, rows.map((r) => r.id)));
  return rows.length;
}

export async function createClaim(userId: string, reg: string, roll: string) {
  const r = reg.trim().replace(/[^\w-]/g, "");
  const n = roll.trim().replace(/[^\w-]/g, "");
  if (!r || !n) throw new ResultsError("Enter both the registration and roll number.");
  const [row] = await db()
    .select({ id: t.certificates.id, holder: t.certificates.holderUserId })
    .from(t.certificateDetails)
    .innerJoin(t.certificates, eq(t.certificates.id, t.certificateDetails.certificateId))
    .where(and(eq(t.certificateDetails.regNo, r), eq(t.certificateDetails.rollNo, n)))
    .limit(1);
  if (!row) throw new ResultsError("No certificate was found with those numbers. Check them against your certificate.");
  if (row.holder === userId) throw new ResultsError("This certificate is already in your account.");
  if (row.holder) throw new ResultsError("This certificate is already linked to another account. Contact NYTI if this is a mistake.");
  const [prev] = await db().select().from(t.certificateClaims).where(and(eq(t.certificateClaims.userId, userId), eq(t.certificateClaims.certificateId, row.id))).limit(1);
  if (prev?.status === "pending") throw new ResultsError("You've already asked for this certificate — NYTI will review it soon.");
  if (prev) await db().update(t.certificateClaims).set({ status: "pending", note: null, reviewedBy: null, reviewedAt: null }).where(eq(t.certificateClaims.id, prev.id));
  else await db().insert(t.certificateClaims).values({ userId, certificateId: row.id });
  return row.id;
}

export async function listClaims(filter: { userId?: string; status?: "pending" | "approved" | "rejected" } = {}) {
  const conds = [filter.userId ? eq(t.certificateClaims.userId, filter.userId) : undefined, filter.status ? eq(t.certificateClaims.status, filter.status) : undefined].filter(Boolean);
  return db()
    .select({ claim: t.certificateClaims, user: { name: t.users.name, email: t.users.email }, cert: { id: t.certificates.id, holderName: t.certificates.holderName, courseTitle: t.certificates.courseTitle, holderUserId: t.certificates.holderUserId } })
    .from(t.certificateClaims)
    .innerJoin(t.users, eq(t.users.id, t.certificateClaims.userId))
    .innerJoin(t.certificates, eq(t.certificates.id, t.certificateClaims.certificateId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(t.certificateClaims.createdAt));
}

export async function reviewClaim(id: number, decision: "approved" | "rejected", note: string, viewer: Viewer) {
  if (viewer.role !== "admin") throw new ResultsError("Not allowed.");
  const [c] = await db().select().from(t.certificateClaims).where(eq(t.certificateClaims.id, id)).limit(1);
  if (!c || c.status !== "pending") throw new ResultsError("This request was already handled.");
  const [cert] = await db().select().from(t.certificates).where(eq(t.certificates.id, c.certificateId)).limit(1);
  if (decision === "approved" && cert?.holderUserId && cert.holderUserId !== c.userId) throw new ResultsError("The certificate was linked to another account in the meantime.");
  await db().transaction(async (tx) => {
    await tx.update(t.certificateClaims).set({ status: decision, note: note.trim() || null, reviewedBy: viewer.id, reviewedAt: new Date() }).where(eq(t.certificateClaims.id, id));
    if (decision === "approved") await tx.update(t.certificates).set({ holderUserId: c.userId }).where(eq(t.certificates.id, c.certificateId));
  });
  await notify(c.userId, {
    title: decision === "approved" ? "Certificate added to your account" : "Certificate request not approved",
    body: decision === "approved" ? `${c.certificateId} is now in your Certificates.` : `${c.certificateId}: ${note.trim() || "contact NYTI for details."}`,
    type: "certificate",
    href: decision === "approved" ? `/dashboard/certificates/${c.certificateId}` : "/dashboard/certificates",
    email: true,
  });
}
