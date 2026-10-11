import type { Metadata } from "next";
import { AssessmentList } from "../AssessmentList";

export const metadata: Metadata = { title: "Assignments" };

export default function AssignmentsPage() {
  return <AssessmentList title="Assignments" description="Projects and practical work submitted for review." types={["assignment", "practical"]} />;
}
