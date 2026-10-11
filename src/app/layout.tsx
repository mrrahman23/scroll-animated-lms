import type { Metadata, Viewport } from "next";
import { SiteProvider } from "@/components/site/SiteProvider";
import { getSite } from "@/lib/api";
import { Bricolage_Grotesque, JetBrains_Mono, Onest, Public_Sans, Sora, Source_Serif_4 } from "next/font/google";
import { ThemeEffects } from "@/components/theme/ThemeEffects";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ThemeScript } from "@/components/theme/ThemeScript";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { getSiteSettings } from "@/lib/site-settings";
import { ToastProvider } from "@/components/ui/Toast";
import { RevealObserver } from "@/components/ui/interactive";
import "./globals.css";

const publicSans = Public_Sans({ variable: "--font-public-sans", subsets: ["latin"], display: "swap" });
const sourceSerif = Source_Serif_4({ variable: "--font-source-serif", subsets: ["latin"], display: "swap", weight: ["400", "600", "700"], style: ["normal", "italic"] });
// Display faces for the Aurora and Spark themes (not preloaded: only fetched when a theme uses them)
const sora = Sora({ variable: "--font-sora", subsets: ["latin"], display: "swap", preload: false, weight: ["400", "600", "700"] });
const onest = Onest({ variable: "--font-onest", subsets: ["latin"], display: "swap", preload: false, weight: ["300", "400", "500", "600"] });
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], display: "swap", preload: false, weight: ["400", "500", "700"] });
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], display: "swap", preload: false, weight: ["500", "700", "800"] });

// Pages are rendered per request from the content files in /data, so edits made in
// Admin → Website (or directly in the files) show immediately and nothing pre-built goes stale.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();
  return {
    metadataBase: new URL(site.url),
    title: { default: site.seo.title, template: `%s · ${site.shortName}` },
    description: site.seo.description,
    openGraph: { siteName: site.name, type: "website", locale: "en_BD" },
  };
}

export const viewport: Viewport = { themeColor: "#0c1b40" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [settings, site] = await Promise.all([getSiteSettings(), getSite()]);
  return (
    // data-ui is set by ThemeScript before paint (visitor choice may differ from the site default)
    <html lang="en" suppressHydrationWarning className={`${publicSans.variable} ${sourceSerif.variable} ${sora.variable} ${bricolage.variable} ${onest.variable} ${mono.variable} antialiased`}>
      <head>
        <ThemeScript siteDefault={settings.defaultTheme} allowSwitch={settings.allowThemeSwitcher} />
      </head>
      <body className="flex min-h-screen flex-col">
        <a href="#main" className="sr-only z-[200] rounded-lg bg-navy-900 px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
          Skip to main content
        </a>
        <SiteProvider site={site}>
          <ThemeProvider siteDefault={settings.defaultTheme} allowSwitch={settings.allowThemeSwitcher}>
            <ToastProvider>{children}</ToastProvider>
            <ThemeEffects />
            <ThemeSwitcher />
          </ThemeProvider>
        </SiteProvider>
        <RevealObserver />
      </body>
    </html>
  );
}
