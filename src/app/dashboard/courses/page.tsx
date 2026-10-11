import type { Metadata } from "next";
import { ContinueLearningCard } from "@/components/dashboard/student";
import { DashboardHeader } from "@/components/dashboard/widgets";
import { ButtonLink } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/interactive";
import { getCourses, getCurrentUser, getEnrollments } from "@/lib/api";

export const metadata: Metadata = { title: "My Courses" };

export default async function MyCoursesPage() {
  const user = await getCurrentUser();
  const [enrollments, courses] = await Promise.all([getEnrollments(user.id), getCourses()]);
  const byId = Object.fromEntries(courses.map((c) => [c.id, c]));
  const list = (status?: string) => (
    <div className="grid gap-4 lg:grid-cols-2">
      {enrollments.filter((e) => !status || e.status === status).map((e) => <ContinueLearningCard key={e.id} enrollment={e} course={byId[e.courseId]} />)}
    </div>
  );
  return (
    <>
      <DashboardHeader title="My Courses" description="Everything you are enrolled in." action={<ButtonLink href="/courses" variant="secondary">Browse Courses</ButtonLink>} />
      <Tabs label="Filter courses" tabs={[
        { id: "all", label: `All (${enrollments.length})`, content: list() },
        { id: "active", label: "In progress", content: list("active") },
        { id: "completed", label: "Completed", content: list("completed") },
      ]} />
    </>
  );
}
