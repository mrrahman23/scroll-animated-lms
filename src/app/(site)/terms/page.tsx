import type { Metadata } from "next";
import { getPage } from "@/lib/api";
import { LegalDocument } from "../LegalDocument";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getPage("legal")).terms.title };
}

export default async function Page() {
  const legal = await getPage("legal");
  return <LegalDocument doc={legal.terms} />;
}
