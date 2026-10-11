import "server-only";
import { getPartners } from "@/lib/api";
import { getBatch, type Viewer } from "@/lib/services/results";
import type { EditorStudent } from "./BatchEditor";

/** Props for BatchEditor from the database (marks shown as typed: marks, or the grade). */
export async function editorProps(id: number, viewer: Viewer) {
  const { batch, course, subjects, students, marks, grading } = await getBatch(id, viewer);
  const partners = viewer.role === "admin" ? (await getPartners({ includePending: true })).map((p) => ({ id: p.id, name: p.name })) : [];
  const rows: EditorStudent[] = students.map((s) => ({
    id: s.id,
    name: s.name,
    fatherName: s.fatherName ?? "",
    motherName: s.motherName ?? "",
    rollNo: s.rollNo ?? "",
    regNo: s.regNo ?? "",
    email: s.email ?? "",
    studentType: s.studentType ?? "Regular",
    photo: s.photo ?? "",
    certificateId: s.certificateId,
    cells: Object.fromEntries(marks.filter((m) => m.studentId === s.id).map((m) => [m.subjectId, m.marks ?? m.grade ?? ""])),
  }));
  return {
    batchId: batch.id,
    role: (viewer.role === "admin" ? "admin" : "partner") as "admin" | "partner",
    status: batch.status,
    reviewNote: batch.reviewNote,
    name: batch.name,
    courseDuration: batch.courseDuration ?? "",
    partnerId: batch.partnerId,
    courseTitle: course.title,
    subjects,
    grading,
    students: rows,
    partners,
  };
}
