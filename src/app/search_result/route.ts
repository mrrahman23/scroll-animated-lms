import { redirectTo } from "@/lib/redirect";

/** Old verify.nytibd.com search page → the new verification page (reg & roll mode). */
export function GET() {
  return redirectTo("/verify-certificate?by=reg", 301);
}
