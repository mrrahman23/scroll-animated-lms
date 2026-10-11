import type { Metadata } from "next";
import { AssessmentList } from "../AssessmentList";

export const metadata: Metadata = { title: "Assessments" };

export default function AssessmentsPage() {
  return <AssessmentList title="Assessments" description="Quizzes, exams and practical assessments required for certification." types={["quiz", "exam", "practical", "assignment"]} />;
}
