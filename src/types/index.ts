/**
 * NYTI domain models.
 * These interfaces mirror the shape expected from the future backend API.
 * UI components consume these types only — never raw API payloads.
 */

export type ID = string;
export type ISODate = string; // e.g. "2026-09-15"

export type UserRole = "student" | "instructor" | "partner" | "admin";
export type LearningMode = "online" | "offline" | "hybrid";
export type CourseLevel = "Beginner" | "Intermediate" | "Advanced" | "All Levels";

export interface User {
  id: ID;
  name: string;
  firstName: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatarUrl?: string;
  location?: string;
  joinedAt: ISODate;
  partnerId?: ID; // set when role === "partner"
}

export interface Category {
  id: ID;
  slug: string;
  name: string;
  description: string;
  icon: string; // lucide icon key, resolved in UI via an icon map
  courseCount: number;
}

export interface Instructor {
  id: ID;
  name: string;
  title: string;
  bio: string;
  initials: string;
  rating: number;
  students: number;
}

export interface Lesson {
  id: ID;
  title: string;
  type: "video" | "reading" | "quiz" | "assignment" | "practical";
  durationMinutes: number;
  isPreview?: boolean;
}

export interface CourseModule {
  id: ID;
  title: string;
  lessons: Lesson[];
}

export interface Course {
  id: ID;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  categoryId: ID;
  instructorId: ID;
  modes: LearningMode[];
  level: CourseLevel;
  durationWeeks: number;
  hoursPerWeek: number;
  language: string;
  students: number;
  rating: number;
  reviewCount: number;
  price: number; // in BDT; 0 = free
  certificate: boolean;
  featured?: boolean;
  outcomes: string[];
  requirements: string[];
  curriculum: CourseModule[];
  partnerIds: ID[]; // offline delivery partners
  nextIntake?: ISODate;
  /**
   * Optional cover image: a path in /public (e.g. "/images/courses/design.jpg") or an https:// URL.
   * When empty, a generated thumbnail is drawn from `thumbnail`.
   */
  image?: string;
  imageAlt?: string;
  /** Visual seed for the generated thumbnail (used when `image` is not set). */
  thumbnail: { hue: "navy" | "blue" | "teal" | "indigo" | "slate" | "sky"; icon: string };
  /** Subjects on the mark sheet (results are entered per subject in Admin → Results). */
  subjects?: CourseSubject[];
  /** Hidden from the public catalogue (e.g. diploma programmes that only issue results). */
  hidden?: boolean;
}

export interface CourseSubject {
  id: ID;
  /** 0 = no semesters; 1…n = semester */
  semester: number;
  code: string;
  name: string;
  fullMarks: number;
}

/** data/grading.json — marks → letter grade and grade point. */
export interface GradingScale {
  scale: { minMarks: number; grade: string; gradePoint: number }[];
  /** Grade that means the subject is failed (no certificate is issued). */
  failGrade: string;
}

export type PartnerStatus = "active" | "pending" | "suspended";

export interface Partner {
  id: ID;
  slug: string;
  name: string;
  shortName: string;
  /** Optional logo: a path in /public (e.g. "/images/partners/abc.svg") or an https:// URL. */
  logo?: string;
  type: "Technical Institute" | "Training Center" | "College" | "NGO" | "Corporate Academy";
  city: string;
  district: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  authorizationNumber: string;
  status: PartnerStatus;
  since: number;
  modes: LearningMode[];
  categoryIds: ID[];
  courseIds: ID[];
  facilities: string[];
  certificatesIssued: number;
  studentsTrained: number;
  description: string;
}

export type CertificateStatus = "valid" | "expired" | "revoked";

export interface Certificate {
  id: ID; // public certificate ID e.g. NYTI-2026-000123
  holderName: string;
  holderUserId?: ID;
  courseId: ID;
  courseTitle: string;
  issuedByPartnerId?: ID; // undefined when issued directly by NYTI
  issuedByName: string;
  issueDate: ISODate;
  expiryDate?: ISODate;
  status: CertificateStatus;
  statusReason?: string;
  grade?: string;
  mode: LearningMode;
  hours: number;
}

/** Public-safe projection returned by the verification service. */
export interface MarkSheetSubject {
  /** 0 = no semesters; 1…n = semester */
  semester: number;
  code: string | null;
  name: string;
  grade: string | null;
  gradePoint: string | null;
  marks: string | null;
}

/** Student record and mark sheet shown under "Show details" (offline/diploma results). */
export interface CertificateDetails {
  rollNo: string | null;
  regNo: string | null;
  fatherName: string | null;
  motherName: string | null;
  studentType: string | null;
  institute: string | null;
  courseDuration: string | null;
  batch: string | null;
  cgpa: string | null;
  photoUrl: string | null;
  scanUrl: string | null;
  subjects: MarkSheetSubject[];
}

export interface VerificationResult {
  query: string;
  found: boolean;
  checkedAt: string;
  certificate?: Pick<
    Certificate,
    "id" | "holderName" | "courseTitle" | "issuedByName" | "issueDate" | "expiryDate" | "status" | "statusReason" | "mode"
  >;
  details?: CertificateDetails;
}

export interface Enrollment {
  id: ID;
  userId: ID;
  courseId: ID;
  mode: LearningMode;
  enrolledAt: ISODate;
  progress: number; // 0–100
  completedLessons: number;
  totalLessons: number;
  lastAccessedAt: ISODate;
  status: "pending" | "active" | "completed" | "paused";
  nextLessonTitle?: string;
  certificateId?: ID;
}

export interface Assessment {
  id: ID;
  courseId: ID;
  title: string;
  type: "quiz" | "exam" | "practical" | "assignment";
  dueDate: ISODate;
  status: "upcoming" | "submitted" | "graded" | "overdue";
  score?: number;
  maxScore: number;
}

export interface Payment {
  id: ID;
  userId: ID;
  courseId: ID;
  amount: number;
  currency: "BDT";
  method: "bKash" | "Nagad" | "Card" | "Bank Transfer";
  status: "paid" | "pending" | "refunded" | "failed";
  date: ISODate;
  invoiceNo: string;
  /** bKash / Nagad / bank transaction ID entered by the learner */
  transactionRef?: string;
  /** Admin note, e.g. why a payment couldn't be confirmed */
  note?: string;
}

export interface Notification {
  id: ID;
  userId: ID;
  title: string;
  body: string;
  type: "course" | "assessment" | "certificate" | "payment" | "system";
  createdAt: string;
  read: boolean;
  href?: string;
}

export interface NewsItem {
  id: ID;
  slug: string;
  category: "Course Launch" | "Upcoming Training" | "Ceremony" | "Partners" | "Programs" | "Workshop";
  title: string;
  excerpt: string;
  date: ISODate;
  body: string[];
}

export interface Testimonial {
  id: ID;
  name: string;
  courseTitle: string;
  quote: string;
  location: string;
  isSample: boolean;
}

export interface PlatformStat {
  key: string;
  value: number;
  suffix?: string;
  label: string;
}

export interface ActivityItem {
  id: ID;
  type: "registration" | "enrollment" | "certificate" | "partner" | "verification" | "revocation";
  message: string;
  actor: string;
  at: string;
}
