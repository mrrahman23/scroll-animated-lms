/**
 * Shapes of the editable JSON files in /data.
 * Icon fields take a key from the icon map in components/ui/Icon.tsx.
 */
import type { CertificateStatus, PlatformStat, User } from "./index";

export interface Link {
  label: string;
  href: string;
}
export interface NavItem extends Link {
  shortLabel?: string;
  description?: string;
}
export interface IconItem {
  icon: string;
  title: string;
  body: string;
}
export interface TitledText {
  title: string;
  body: string;
}
export interface Hero {
  eyebrow?: string;
  title: string;
  description?: string;
}

export interface SiteContent {
  name: string;
  shortName: string;
  tagline: string;
  motto: string;
  url: string;
  /** Optional logo image (uploaded in Admin → Website, or a /public path / https URL). Empty = built-in shield. */
  logo?: string;
  /** Optional light version for dark backgrounds (footer, portals). */
  logoOnDark?: string;
  /** Show the name next to the logo (turn off when the image already contains it). Default true. */
  showNameWithLogo?: boolean;
  seo: { title: string; description: string };
  announcement: string;
  contact: {
    addressLines: string[];
    phones: string[];
    emails: { general: string; verification: string };
    officeHours: string[];
    /** Google Maps "Embed a map" URL. Leave empty to show a placeholder. */
    mapEmbedUrl: string;
  };
  social: { platform: "facebook" | "linkedin" | "youtube" | "x"; url: string }[];
  certificate: { signatoryName: string; signatoryTitle: string };
  verification: { exampleId: string; samples: { label: string; id: string }[] };
  navigation: {
    courses: NavItem[];
    main: NavItem[];
    footer: { title: string; links: Link[] }[];
  };
  footerNote: string;
  copyright: string;
  /** Manual payment details shown when enrolling in a paid course. */
  payments?: { instructions: string; methods: { method: "bKash" | "Nagad" | "Bank Transfer"; details: string }[] };
}

export interface StudentProfile extends User {
  learningHours: number;
  weeklyHours: { day: string; hours: number }[];
}
export interface UsersContent {
  student: StudentProfile;
  instructor: User & { instructorId: string };
  partner: User & { partnerId: string };
  admin: User;
}

export interface StatsContent {
  platform: PlatformStat[];
}

export interface Delta {
  value: string;
  period: string;
  positive: boolean;
}
export interface AdminContent {
  periodLabel: string;
  totals: { totalStudents: number; activeCourses: number; authorizedPartners: number; certificatesIssued: number; certificatesVerified: number };
  deltas: Partial<Record<"totalStudents" | "activeCourses" | "authorizedPartners" | "certificatesIssued" | "certificatesVerified" | "revenue", Delta>>;
  certificationBreakdown: Record<CertificateStatus, number>;
  monthly: { month: string; online: number; offline: number; revenue: number; certificates: number }[];
  activity: import("./index").ActivityItem[];
}

export interface PortalsContent {
  instructor: {
    awaitingGrading: number;
    averageRating: number;
    courseCompletion: Record<string, number>;
    gradingQueue: { student: string; task: string; courseId: string }[];
  };
  partner: {
    certificationRequests: { batch: string; courseId: string; learners: number; status: "Draft" | "Under review" | "Approved" | "Rejected" }[];
  };
}

/* ---------- Pages ---------- */
export interface HomePage {
  hero: {
    eyebrow: string;
    headline: string[];
    highlight: string;
    description: string;
    primaryCta: Link;
    secondaryCta: Link;
    /** Ember theme: giant word along the bottom of the hero. */
    backdropWord?: string;
    /** Ember theme: vertical caption on the right. */
    sideCaption?: string;
    /** Ember theme: numbered chapter links (anchors to homepage sections). */
    chapters?: Link[];
    visual: {
      lessonLabel: string;
      courseTitle: string;
      progress: number;
      certificateName: string;
      certificateId: string;
      verifiedTitle: string;
      verifiedMeta: string;
      batchTitle: string;
      batchMeta: string;
      badge: string;
    };
  };
  explore: { eyebrow: string; title: string; description: string; categoriesTitle: string };
  featured: { eyebrow: string; title: string; description: string; count: number };
  modes: {
    eyebrow: string;
    title: string;
    description: string;
    online: ModeCard;
    offline: ModeCard;
  };
  certification: { eyebrow: string; title: string; description: string; steps: IconItem[]; cta: Link };
  verify: { title: string; description: string; points: string[]; link: Link };
  partners: {
    eyebrow: string;
    title: string;
    description: string;
    count: number;
    logoCarousel?: { show: boolean; title?: string; seconds?: number };
    cta: { title: string; body: string } & Link;
  };
  why: { eyebrow: string; title: string; reasons: IconItem[] };
  testimonials: { eyebrow: string; title: string; sampleNotice: string };
  news: { eyebrow: string; title: string; count: number };
  finalCta: { eyebrow: string; title: string; description: string; primary: Link; secondary: Link };
  /** 3D-world themes: a clear pause in the page where the scene's finale plays. */
  worldWindow?: { eyebrow?: string; title: string; caption?: string };
}
export interface ModeCard {
  eyebrow: string;
  title: string;
  icon: string;
  points: string[];
  cta: Link;
}

export interface AboutPage {
  hero: Hero;
  mission: string;
  vision: string;
  objectives: string[];
  standardsTitle: string;
  standards: IconItem[];
  leadership: { name: string; role: string }[];
  leadershipNotice?: string;
}
export interface HelpPage {
  hero: Hero;
  topics: { icon: string; title: string; href: string }[];
  faqs: { question: string; answer: string }[];
}
export interface CertificationsPage {
  hero: Hero;
  verification: {
    eyebrow: string;
    title: string;
    steps: TitledText[];
    statusesTitle: string;
    statuses: ({ status: CertificateStatus } & TitledText)[];
  };
}
export interface PartnershipPage {
  hero: Hero;
  benefits: IconItem[];
  process: TitledText[];
}
export interface HeroPage {
  hero: Hero;
}
export interface OnlineCoursesPage extends HeroPage {
  features: IconItem[];
}
export interface ContactPage extends HeroPage {
  subjects: string[];
}
export interface VerifyPage {
  title: string;
  subtitle: string;
  features: IconItem[];
}
export interface LegalDoc {
  title: string;
  updated: string;
  intro: string;
  sections: { heading: string; body: string }[];
}
export interface LegalPage {
  terms: LegalDoc;
  privacy: LegalDoc;
}

export interface PageContentMap {
  home: HomePage;
  about: AboutPage;
  help: HelpPage;
  certifications: CertificationsPage;
  "become-a-partner": PartnershipPage;
  courses: HeroPage;
  "online-courses": OnlineCoursesPage;
  "offline-training": HeroPage;
  partners: HeroPage;
  news: HeroPage;
  contact: ContactPage;
  "verify-certificate": VerifyPage;
  legal: LegalPage;
}
