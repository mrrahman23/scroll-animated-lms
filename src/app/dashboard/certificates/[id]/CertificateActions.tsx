"use client";

import { Download, Share2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Button, buttonClasses } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

export function CertificateActions({ id, verifyUrl }: { id: string; verifyUrl: string }) {
  const toast = useToast();
  const share = async () => {
    const url = `${window.location.origin}/verify-certificate?id=${id}`;
    try {
      if (navigator.share) await navigator.share({ title: "My NYTI certificate", url });
      else {
        await navigator.clipboard.writeText(url);
        toast({ tone: "success", title: "Verification link copied", description: "Share it with employers so they can confirm your certificate." });
      }
    } catch {
      /* user cancelled */
    }
  };
  return (
    <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
      <Button onClick={() => window.print()}><Download className="size-4" aria-hidden /> Download Certificate</Button>
      <Button variant="secondary" onClick={share}><Share2 className="size-4" aria-hidden /> Share Certificate</Button>
      <Link href={verifyUrl} className={buttonClasses({ variant: "verify" })}><ShieldCheck className="size-4" aria-hidden /> Verify Certificate</Link>
    </div>
  );
}
