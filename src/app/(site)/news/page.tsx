import type { Metadata } from "next";
import { NewsCard } from "@/components/home/sections";
import { PageHero } from "@/components/ui/primitives";
import { getNews, getPage } from "@/lib/api";

export const metadata: Metadata = { title: "News & Updates", description: "Course launches, training intakes, ceremonies and partner announcements from NYTI." };

export default async function NewsPage() {
  const [items, page] = await Promise.all([getNews(), getPage("news")]);
  return (
    <>
      <PageHero eyebrow={page.hero.eyebrow} title={page.hero.title} description={page.hero.description} />
      <div className="container-page grid gap-6 py-14 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((n) => <NewsCard key={n.id} item={n} />)}
      </div>
    </>
  );
}
