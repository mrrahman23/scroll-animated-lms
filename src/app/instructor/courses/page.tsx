import type { Metadata } from "next";
import Link from "next/link";
import { DashboardCard, DashboardHeader } from "@/components/dashboard/widgets";
import { getCourses, getPortalIdentity, getUsers } from "@/lib/api";
import { isDemoMode } from "@/lib/auth/session";
import { modesLabel } from "@/lib/format";

export const metadata: Metadata = { title: "My courses" };

export default async function Page() {
  const me = await getPortalIdentity("instructor");
  const instructorId = isDemoMode() ? (await getUsers()).instructor.instructorId : me.instructorId;
  const courses = (await getCourses()).filter((c) => c.instructorId === instructorId);
  return (
    <>
      <DashboardHeader title="My courses" description="Course content and curriculum are maintained in data/courses.json by NYTI." />
      <div className="space-y-6">
        {courses.map((c) => (
          <DashboardCard key={c.id} title={c.title} action={<Link href={`/courses/${c.slug}`} className="text-sm font-semibold text-brand-700">Public page</Link>}>
            <p className="-mt-2 mb-4 text-sm text-muted">{modesLabel(c.modes)} · {c.durationWeeks} weeks · {c.curriculum.reduce((s, m) => s + m.lessons.length, 0)} lessons</p>
            <ol className="grid gap-3 sm:grid-cols-2">
              {c.curriculum.map((m) => (
                <li key={m.id} className="rounded-xl bg-surface p-3">
                  <p className="text-sm font-semibold text-navy-900">{m.title}</p>
                  <ul className="mt-1 space-y-0.5 text-xs text-muted">{m.lessons.map((l) => <li key={l.id}>{l.title} · {l.durationMinutes} min</li>)}</ul>
                </li>
              ))}
            </ol>
          </DashboardCard>
        ))}
        {courses.length === 0 && <p className="text-sm text-muted">No courses assigned to your instructor profile yet.</p>}
      </div>
    </>
  );
}
