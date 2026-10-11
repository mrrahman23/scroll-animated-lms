import Image from "next/image";
import { cn } from "@/lib/format";

export const isRemoteImage = (src: string) => /^https?:\/\//i.test(src);
/** External links and admin uploads (data/uploads, served by a route) are shown as-is. */
const skipOptimizer = (src: string) => isRemoteImage(src) || src.startsWith("/uploads/") || src.endsWith(".svg");

/**
 * Renders an image path/URL coming from the JSON content.
 * - Local files in /public are optimised (resized, modern formats) by Next.js.
 * - External https:// links are shown as-is, so any image host works without extra config.
 * The parent must be positioned and sized (the image fills it).
 */
export function DataImage({
  src,
  alt,
  sizes,
  className,
  priority,
}: {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
}) {
  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} unoptimized={skipOptimizer(src)} className={cn("object-cover", className)} />;
}
