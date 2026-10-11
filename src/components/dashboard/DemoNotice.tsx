import { Database } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/widgets";
import { EmptyState } from "@/components/ui/primitives";

/** Shown on management pages when the site runs without a database. */
export function DemoNotice({ title }: { title: string }) {
  return (
    <>
      <DashboardHeader title={title} />
      <EmptyState
        icon={<Database className="size-5" />}
        title="Available once the database is connected"
        description="This site is running in demo mode from JSON files. Set DATABASE_URL (see docs/DEPLOY-CPANEL.md) to manage real records here."
      />
    </>
  );
}
