import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import SiteNotFound from "./(site)/not-found";

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main id="main" className="flex-1">
        <SiteNotFound />
      </main>
      <Footer />
    </>
  );
}
