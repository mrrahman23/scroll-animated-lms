import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/format";

type Variant = "primary" | "secondary" | "ghost" | "verify" | "inverse" | "inverse-outline" | "link";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 active:translate-y-px";

const variants: Record<Variant, string> = {
  primary: "bg-brand-600 text-white shadow-sm shadow-brand-900/10 hover:bg-brand-700 hover:shadow-md",
  secondary: "border border-navy-200 bg-white text-navy-800 hover:border-navy-300 hover:bg-navy-50",
  ghost: "text-navy-700 hover:bg-navy-50",
  verify: "bg-verify-600 text-white shadow-sm hover:bg-verify-700 hover:shadow-md",
  inverse: "bg-white text-navy-900 hover:bg-navy-50",
  "inverse-outline": "border border-white/30 text-white hover:bg-white/10 hover:border-white/50",
  link: "px-0! py-0! h-auto! text-brand-700 hover:text-brand-800 group",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-6 text-base",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

export function buttonClasses({ variant = "primary", size = "md", className }: Omit<CommonProps, "children">) {
  return cn(base, `btn-${variant}`, variants[variant], sizes[size], className);
}

export function Button({ variant, size, className, ...props }: CommonProps & ComponentProps<"button">) {
  return <button className={buttonClasses({ variant, size, className })} {...props} />;
}

export function ButtonLink({ variant, size, className, href, ...props }: CommonProps & ComponentProps<typeof Link>) {
  return <Link href={href} className={buttonClasses({ variant, size, className })} {...props} />;
}
