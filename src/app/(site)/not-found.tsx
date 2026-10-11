import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <section className="container-page flex flex-col items-center py-28 text-center">
      <p className="font-display text-7xl font-semibold text-navy-200">404</p>
      <h1 className="display mt-4 text-3xl">Page not found</h1>
      <p className="mt-3 max-w-md text-muted">The page you are looking for may have moved. Try the course catalogue or verify a certificate.</p>
      <div className="mt-8 flex gap-3">
        <ButtonLink href="/courses">Browse Courses</ButtonLink>
        <ButtonLink href="/verify-certificate" variant="secondary">Verify Certificate</ButtonLink>
      </div>
    </section>
  );
}
