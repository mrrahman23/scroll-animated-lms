import type { Metadata } from "next";
import { CourseCard, CourseGrid } from "@/components/course/CourseCard";
import { DashboardHeader } from "@/components/dashboard/widgets";
import { getCategories, getCoursesByIds, getPartner, getPortalIdentity, getUsers } from "@/lib/api";
import { isDemoMode } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Courses" };

export default async function Page() {
  const me = await getPortalIdentity("partner");
  const partnerId = isDemoMode() ? (await getUsers()).partner.partnerId : me.partnerId;
  const p = partnerId ? await getPartner(partnerId) : undefined;
  const [courses, categories] = await Promise.all([getCoursesByIds(p?.courseIds ?? []), getCategories()]);
  const cat = Object.fromEntries(categories.map((c) => [c.id, c]));
  return (
    <>
      <DashboardHeader title="Authorized courses" description="Programmes your organisation is authorized to deliver and certify." />
      <CourseGrid>{courses.map((c) => <CourseCard key={c.id} course={c} category={cat[c.categoryId]} />)}</CourseGrid>
      {courses.length === 0 && <p className="text-sm text-muted">No authorized courses.</p>}
    </>
  );
}
