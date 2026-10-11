import type { Metadata } from "next";
import { DemoNotice } from "@/components/dashboard/DemoNotice";
import { GradingQueue } from "@/components/dashboard/GradingQueue";
import { DashboardHeader } from "@/components/dashboard/widgets";
import { getPortalIdentity } from "@/lib/api";
import { isDemoMode } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Grading" };

export default async function Page() {
  const me = await getPortalIdentity("instructor");
  if (isDemoMode()) return <DemoNotice title="Grading" />;
  const { instructorView } = await import("@/lib/services/portals");
  const { courses, queue } = await instructorView(me.instructorId);
  return (
    <>
      <DashboardHeader title="Grading" description="Pass mark is 50%. When a learner has completed every lesson and passed every assessment, the course completes automatically (online learners receive their certificate)." />
      <GradingQueue
        items={queue.map((q) => ({
          id: q.sub.id,
          status: q.sub.status,
          score: q.sub.score,
          feedback: q.sub.feedback,
          content: q.sub.content,
          link: q.sub.link,
          submittedAt: q.sub.submittedAt.toISOString(),
          assessment: { title: q.assessment.title, maxScore: q.assessment.maxScore },
          course: courses.find((c) => c.id === q.sub.courseId)?.title ?? q.sub.courseId,
          learner: { name: q.learner.name, email: q.learner.email },
        }))}
      />
    </>
  );
}
