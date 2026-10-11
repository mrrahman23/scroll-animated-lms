import type { NextRequest } from "next/server";
import { redirectTo } from "@/lib/redirect";

/** Old image links (verify.nytibd.com/storage/images/…) → the copies kept on this site. */
export async function GET(_request: NextRequest, { params }: RouteContext<"/storage/[...path]">) {
  const rel = (await params).path.join("/");
  if (!/^images\/(image|certificate)\/[\w.-]+\.(jpe?g|png|webp|gif)$/i.test(rel)) return new Response("Not found", { status: 404 });
  return redirectTo(`/uploads/legacy/${rel}`, 301);
}
