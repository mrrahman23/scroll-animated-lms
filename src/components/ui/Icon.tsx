import {
  Award,
  BadgeCheck,
  BookOpen,
  Building2,
  ClipboardCheck,
  ClipboardList,
  Compass,
  CreditCard,
  Download,
  Landmark,
  Laptop,
  LifeBuoy,
  Lock,
  MessageCircle,
  MonitorPlay,
  QrCode,
  Scale,
  School,
  ShieldCheck,
  Users,
  Briefcase,
  Calculator,
  Code,
  ConciergeBell,
  FileSpreadsheet,
  GraduationCap,
  HeartPulse,
  Kanban,
  Languages,
  Megaphone,
  Monitor,
  Palette,
  Rocket,
  Sprout,
  Wrench,
  Zap,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

/** Maps icon keys stored in data (e.g. Category.icon) to components. */
const iconMap: Record<string, LucideIcon> = {
  monitor: Monitor,
  briefcase: Briefcase,
  calculator: Calculator,
  megaphone: Megaphone,
  palette: Palette,
  "file-spreadsheet": FileSpreadsheet,
  languages: Languages,
  "concierge-bell": ConciergeBell,
  "heart-pulse": HeartPulse,
  wrench: Wrench,
  rocket: Rocket,
  sprout: Sprout,
  code: Code,
  zap: Zap,
  kanban: Kanban,
  award: Award,
  "badge-check": BadgeCheck,
  "book-open": BookOpen,
  building: Building2,
  "clipboard-check": ClipboardCheck,
  "clipboard-list": ClipboardList,
  compass: Compass,
  "credit-card": CreditCard,
  download: Download,
  landmark: Landmark,
  laptop: Laptop,
  "life-buoy": LifeBuoy,
  lock: Lock,
  "message-circle": MessageCircle,
  "monitor-play": MonitorPlay,
  "qr-code": QrCode,
  scale: Scale,
  school: School,
  "shield-check": ShieldCheck,
  users: Users,
};

/** Icon keys that can be used in the JSON files. */
export const iconNames = Object.keys(iconMap);

export function Icon({ name, ...props }: { name: string } & LucideProps) {
  const Cmp = iconMap[name] ?? GraduationCap;
  return <Cmp aria-hidden {...props} />;
}

type SocialName = "facebook" | "linkedin" | "youtube" | "x";
const socialPaths: Record<SocialName, string> = {
  facebook: "M14 8h3V4h-3c-2.8 0-4.5 1.8-4.5 4.6V11H7v4h2.5v9h4v-9h3l.5-4h-3.5V8.8c0-.5.3-.8.5-.8Z",
  linkedin: "M4.5 9h3.6v11H4.5V9Zm1.8-5.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4ZM10.2 9h3.4v1.6c.5-.9 1.7-1.9 3.6-1.9 3.8 0 4.3 2.4 4.3 5.6V20h-3.6v-5c0-1.3 0-2.9-1.8-2.9s-2.1 1.4-2.1 2.8V20h-3.6V9Z",
  youtube: "M22 8.2a3 3 0 0 0-2-2.1C18.2 5.6 12 5.6 12 5.6s-6.2 0-8 .5a3 3 0 0 0-2 2.1A31 31 0 0 0 1.6 12c0 1.3.1 2.6.4 3.8a3 3 0 0 0 2 2.1c1.8.5 8 .5 8 .5s6.2 0 8-.5a3 3 0 0 0 2-2.1c.3-1.2.4-2.5.4-3.8s-.1-2.6-.4-3.8ZM10 15.2V8.8l5.3 3.2L10 15.2Z",
  x: "M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.3L5.3 21H2.2l7.2-8.3L1.8 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.5l11.2 14.5Z",
};

export function SocialIcon({ name, className }: { name: SocialName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d={socialPaths[name]} />
    </svg>
  );
}
