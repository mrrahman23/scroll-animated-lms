import type { CourseSubject, GradingScale } from "@/types";

/** Marks → grade rules shared by the results grid (live preview) and the server (saving). */
export class GradeError extends Error {}


export interface Cell {
  marks: string | null;
  grade: string | null;
  gradePoint: string | null;
}

/** "78" → marks + worked-out grade; "A+" → that grade directly; "" → empty. */
export function gradeCell(raw: string, subject: Pick<CourseSubject, "fullMarks" | "name">, grading: GradingScale): Cell | null {
  const v = raw.trim();
  if (!v) return null;
  const scale = [...grading.scale].sort((a, b) => b.minMarks - a.minMarks);
  if (/^\d+(\.\d+)?$/.test(v)) {
    const marks = Number(v);
    const full = subject.fullMarks > 0 ? subject.fullMarks : 100;
    if (marks > full) throw new GradeError(`${subject.name}: ${marks} is more than the full marks (${full}).`);
    const pct = (marks / full) * 100;
    const g = scale.find((x) => pct >= x.minMarks) ?? scale[scale.length - 1];
    return { marks: String(marks), grade: g.grade, gradePoint: g.gradePoint.toFixed(2) };
  }
  const g = scale.find((x) => x.grade.toLowerCase() === v.toLowerCase());
  if (!g) throw new GradeError(`${subject.name}: "${v}" is neither marks nor a grade (${scale.map((x) => x.grade).join(", ")}).`);
  return { marks: null, grade: g.grade, gradePoint: g.gradePoint.toFixed(2) };
}

export function summarize(cells: (Cell | null | undefined)[], subjects: number, grading: GradingScale) {
  const graded = cells.filter((c): c is Cell => !!c && !!c.grade);
  const failed = graded.some((c) => c.grade === grading.failGrade);
  const complete = graded.length === subjects && subjects > 0;
  const gps = graded.map((c) => Number(c.gradePoint ?? 0));
  const cgpa = gps.length ? (gps.reduce((a, b) => a + b, 0) / gps.length).toFixed(2) : null;
  return { complete, failed, cgpa, graded: graded.length };
}
