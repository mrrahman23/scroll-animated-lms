import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getNews, getNewsItem } from "@/lib/api";
import { formatDate } from "@/lib/format";

export async function generateStaticParams() {
  return (await getNews()).map((n) => ({ slug: n.slug }));
}

export async function generateMetadata({ params }: PageProps<"/news/[slug]">): Promise<Metadata> {
  const n = await getNewsItem((await params).slug);
  return n ? { title: n.title, description: n.excerpt } : {};
}

export default async function NewsDetailPage({ params }: PageProps<"/news/[slug]">) {
  const item = await getNewsItem((await params).slug);
  if (!item) notFound();
  return (
    <article className="container-page max-w-3xl py-14 sm:py-20">
      <Link href="/news" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800">
        <ArrowLeft className="size-4" aria-hidden /> All updates
      </Link>
      <p className="mt-8 text-sm"><span className="font-semibold uppercase tracking-wider text-brand-700">{item.category}</span> <span className="text-muted">· <time dateTime={item.date}>{formatDate(item.date)}</time></span></p>
      <h1 className="display mt-3 text-4xl leading-tight sm:text-5xl">{item.title}</h1>
      <p className="mt-6 text-xl leading-relaxed text-muted">{item.excerpt}</p>
      <div className="mt-8 space-y-5 border-t border-line pt-8 text-lg leading-relaxed text-slate-700">
        {item.body.map((p) => <p key={p}>{p}</p>)}
      </div>
    </article>
  );
}
