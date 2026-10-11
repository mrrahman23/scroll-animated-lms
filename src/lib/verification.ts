import { getCertificate } from "@/lib/api";
import { hasDatabase } from "@/lib/db/client";
import type { CertificateDetails, VerificationResult } from "@/types";

/** NYTI-YYYY-NNNNNN, or NYTI-{roll}-{reg} for results imported from the previous system */
export const CERTIFICATE_ID_PATTERN = /^NYTI-(\d{4}-\d{6}|\d{3,10}-\d{3,10})$/;

export function normalizeCertificateId(raw: string) {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export function isWellFormedCertificateId(id: string) {
  return CERTIFICATE_ID_PATTERN.test(id);
}

const cleanNumber = (raw: string) => raw.trim().replace(/[^\w-]/g, "").slice(0, 32);

/**
 * Looks up a certificate by ID, or by registration + roll number (old NYTI certificates), and
 * returns only the fields meant to be public. Contact details and user IDs are never exposed.
 * Results with a mark sheet also return the student record and subject grades.
 */
export async function verifyCertificate(input: string | { reg: string; roll: string }): Promise<VerificationResult> {
  const checkedAt = new Date().toISOString();
  let query: string;
  let certId: string | null = null;

  if (typeof input === "string") {
    query = normalizeCertificateId(input);
    if (isWellFormedCertificateId(query)) certId = query;
  } else {
    const reg = cleanNumber(input.reg);
    const roll = cleanNumber(input.roll);
    query = `Reg ${reg} · Roll ${roll}`;
    if (reg && roll && hasDatabase()) certId = await (await import("@/lib/db/queries")).findCertificateByRegRoll(reg, roll);
  }

  const cert = certId ? await getCertificate(certId) : undefined;
  if (!cert) return { query, found: false, checkedAt };

  const { id, holderName, courseTitle, issuedByName, issueDate, expiryDate, status, statusReason, mode } = cert;
  return {
    query: typeof input === "string" ? query : id,
    found: true,
    checkedAt,
    certificate: { id, holderName, courseTitle, issuedByName, issueDate, expiryDate, status, statusReason, mode },
    details: await detailsFor(id),
  };
}

async function detailsFor(id: string): Promise<CertificateDetails | undefined> {
  if (!hasDatabase()) return undefined;
  const d = await (await import("@/lib/db/queries")).getCertificateDetails(id);
  if (!d) return undefined;
  const { legacyImageUrl } = await import("@/lib/legacy/images");
  return {
    rollNo: d.rollNo,
    regNo: d.regNo,
    fatherName: d.fatherName,
    motherName: d.motherName,
    studentType: d.studentType,
    institute: d.institute,
    courseDuration: d.courseDuration,
    batch: d.batch,
    cgpa: d.cgpa,
    photoUrl: legacyImageUrl(d.photo),
    scanUrl: legacyImageUrl(d.scan),
    subjects: d.subjects,
  };
}

export function verificationUrl(id: string, siteUrl: string) {
  return `${siteUrl.replace(/\/$/, "")}/verify-certificate?id=${encodeURIComponent(id)}`;
}
