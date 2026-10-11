import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { EmberWorld } from "@/components/three/ThemedScenes";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <EmberWorld />
      <Navbar />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}
