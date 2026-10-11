/**
 * MySQL schema (Drizzle ORM). Column names are snake_case; TypeScript fields mirror src/types.
 * Dates that are calendar days are stored as "YYYY-MM-DD" strings, matching the domain types.
 *
 * After changing this file: `npm run db:generate` creates a migration in /drizzle.
 * MariaDB (cPanel) doesn't accept the "serial AUTO_INCREMENT" drizzle writes for serial() ids:
 * in new migrations replace it with "bigint unsigned AUTO_INCREMENT" (package:cpanel checks this).
 * Migrations are applied automatically when the server starts (src/instrumentation.ts).
 */
import { sql } from "drizzle-orm";
import { boolean, datetime, index, int, json, mysqlEnum, mysqlTable, primaryKey, serial, text, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

const createdAt = () => datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`);
const day = (name: string) => varchar(name, { length: 10 });

/* ---------------- People ---------------- */
export const users = mysqlTable(
  "users",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    name: varchar("name", { length: 191 }).notNull(),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    email: varchar("email", { length: 191 }).notNull().unique(),
    phone: varchar("phone", { length: 40 }),
    role: mysqlEnum("role", ["student", "instructor", "partner", "admin"]).notNull(),
    location: varchar("location", { length: 191 }),
    joinedAt: day("joined_at").notNull(),
    partnerId: varchar("partner_id", { length: 64 }),
    instructorId: varchar("instructor_id", { length: 64 }),
    learningHours: int("learning_hours").notNull().default(0),
    weeklyHours: json("weekly_hours").$type<{ day: string; hours: number }[]>(),
    /** scrypt hash. Null = no password set yet (cannot sign in until an admin sets one). */
    passwordHash: varchar("password_hash", { length: 255 }),
    /** Deactivated users cannot sign in. */
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [index("users_role_idx").on(t.role)],
);

/** Signed-in sessions. Only a SHA-256 of the cookie token is stored. */
export const sessions = mysqlTable(
  "sessions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: varchar("user_id", { length: 64 }).notNull(),
    expiresAt: datetime("expires_at").notNull(),
    ipHash: varchar("ip_hash", { length: 64 }),
    userAgent: varchar("user_agent", { length: 255 }),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

/** Sign-in attempts, for throttling password guessing. */
export const authAttempts = mysqlTable(
  "auth_attempts",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 191 }).notNull(),
    ipHash: varchar("ip_hash", { length: 64 }).notNull(),
    success: boolean("success").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("auth_attempts_ip_idx").on(t.ipHash, t.createdAt), index("auth_attempts_email_idx").on(t.email, t.createdAt)],
);

/* ---------------- Certificate registry ---------------- */
export const certificates = mysqlTable(
  "certificates",
  {
    id: varchar("id", { length: 32 }).primaryKey(), // NYTI-YYYY-NNNNNN
    holderName: varchar("holder_name", { length: 191 }).notNull(),
    holderUserId: varchar("holder_user_id", { length: 64 }),
    courseId: varchar("course_id", { length: 64 }).notNull(),
    courseTitle: varchar("course_title", { length: 255 }).notNull(),
    issuedByPartnerId: varchar("issued_by_partner_id", { length: 64 }),
    issuedByName: varchar("issued_by_name", { length: 191 }).notNull(),
    issueDate: day("issue_date").notNull(),
    expiryDate: day("expiry_date"),
    status: mysqlEnum("status", ["valid", "expired", "revoked"]).notNull(),
    statusReason: text("status_reason"),
    grade: varchar("grade", { length: 8 }),
    mode: mysqlEnum("mode", ["online", "offline", "hybrid"]).notNull(),
    hours: int("hours").notNull(),
    createdAt: createdAt(),
    updatedAt: datetime("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => new Date()),
  },
  (t) => [index("certificates_holder_idx").on(t.holderUserId), index("certificates_partner_idx").on(t.issuedByPartnerId)],
);

/**
 * Extra record for certificates with a mark sheet (offline/diploma results, incl. the ones
 * imported from the old verify.nytibd.com system). One row per certificate.
 */
export const certificateDetails = mysqlTable(
  "certificate_details",
  {
    certificateId: varchar("certificate_id", { length: 32 }).primaryKey(),
    legacyStudentId: int("legacy_student_id"),
    rollNo: varchar("roll_no", { length: 32 }),
    regNo: varchar("reg_no", { length: 32 }),
    fatherName: varchar("father_name", { length: 191 }),
    motherName: varchar("mother_name", { length: 191 }),
    studentType: varchar("student_type", { length: 32 }),
    institute: varchar("institute", { length: 255 }),
    courseDuration: varchar("course_duration", { length: 100 }),
    batch: varchar("batch", { length: 100 }),
    cgpa: varchar("cgpa", { length: 8 }),
    /** Photo / scanned certificate: an /uploads path, or a path on the old site until downloaded */
    photo: varchar("photo", { length: 255 }),
    scan: varchar("scan", { length: 255 }),
    /** Links the certificate to the student's account when they register/sign in with this email */
    holderEmail: varchar("holder_email", { length: 191 }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("certificate_details_legacy_idx").on(t.legacyStudentId),
    index("certificate_details_reg_roll_idx").on(t.regNo, t.rollNo),
    index("certificate_details_roll_idx").on(t.rollNo),
    index("certificate_details_email_idx").on(t.holderEmail),
  ],
);

/**
 * A batch of results for one course (e.g. "Jan–Jun 2026"), entered by NYTI or a partner.
 * draft → (partner: submitted → approved) → published. Publishing issues the certificates.
 */
export const resultBatches = mysqlTable(
  "result_batches",
  {
    id: serial("id").primaryKey(),
    courseId: varchar("course_id", { length: 64 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    courseDuration: varchar("course_duration", { length: 100 }),
    /** null = issued by NYTI */
    partnerId: varchar("partner_id", { length: 64 }),
    status: mysqlEnum("status", ["draft", "submitted", "published", "rejected"]).notNull().default("draft"),
    reviewNote: text("review_note"),
    createdBy: varchar("created_by", { length: 64 }).notNull(),
    submittedAt: datetime("submitted_at"),
    publishedAt: datetime("published_at"),
    publishedBy: varchar("published_by", { length: 64 }),
    createdAt: createdAt(),
    updatedAt: datetime("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => new Date()),
  },
  (t) => [index("result_batches_partner_idx").on(t.partnerId, t.status)],
);

export const batchStudents = mysqlTable(
  "batch_students",
  {
    id: serial("id").primaryKey(),
    batchId: int("batch_id").notNull(),
    name: varchar("name", { length: 191 }).notNull(),
    fatherName: varchar("father_name", { length: 191 }),
    motherName: varchar("mother_name", { length: 191 }),
    rollNo: varchar("roll_no", { length: 32 }),
    regNo: varchar("reg_no", { length: 32 }),
    email: varchar("email", { length: 191 }),
    studentType: varchar("student_type", { length: 32 }),
    photo: varchar("photo", { length: 255 }),
    /** Set when the batch is published */
    certificateId: varchar("certificate_id", { length: 32 }),
    sort: int("sort").notNull().default(0),
  },
  (t) => [index("batch_students_batch_idx").on(t.batchId, t.sort)],
);

/** One cell of the results grid: marks (grade worked out) or a grade entered directly. */
export const batchMarks = mysqlTable(
  "batch_marks",
  {
    studentId: int("student_id").notNull(),
    subjectId: varchar("subject_id", { length: 64 }).notNull(),
    marks: varchar("marks", { length: 8 }),
    grade: varchar("grade", { length: 8 }),
    gradePoint: varchar("grade_point", { length: 8 }),
  },
  (t) => [primaryKey({ columns: [t.studentId, t.subjectId] })],
);

/** A signed-in student asking to add an existing certificate (found by reg + roll) to their account. */
export const certificateClaims = mysqlTable(
  "certificate_claims",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 64 }).notNull(),
    certificateId: varchar("certificate_id", { length: 32 }).notNull(),
    status: mysqlEnum("status", ["pending", "approved", "rejected"]).notNull().default("pending"),
    note: text("note"),
    reviewedBy: varchar("reviewed_by", { length: 64 }),
    reviewedAt: datetime("reviewed_at"),
    createdAt: createdAt(),
  },
  (t) => [index("certificate_claims_status_idx").on(t.status), uniqueIndex("certificate_claims_user_cert_idx").on(t.userId, t.certificateId)],
);

/** Subject-wise results (the mark sheet). */
export const certificateSubjects = mysqlTable(
  "certificate_subjects",
  {
    id: serial("id").primaryKey(),
    certificateId: varchar("certificate_id", { length: 32 }).notNull(),
    /** 0 = no semesters (short courses); 1…n = semester number */
    semester: int("semester").notNull().default(0),
    code: varchar("code", { length: 32 }),
    name: varchar("name", { length: 255 }).notNull(),
    grade: varchar("grade", { length: 8 }),
    gradePoint: varchar("grade_point", { length: 8 }),
    marks: varchar("marks", { length: 8 }),
    sort: int("sort").notNull().default(0),
  },
  (t) => [index("certificate_subjects_cert_idx").on(t.certificateId, t.sort)],
);

/** Append-only history of every change to a certificate (audit trail). */
export const certificateEvents = mysqlTable(
  "certificate_events",
  {
    id: serial("id").primaryKey(),
    certificateId: varchar("certificate_id", { length: 32 }).notNull(),
    action: mysqlEnum("action", ["imported", "issued", "updated", "revoked", "expired", "restored"]).notNull(),
    reason: text("reason"),
    actor: varchar("actor", { length: 191 }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("certificate_events_cert_idx").on(t.certificateId)],
);

/** Every public verification lookup. IPs are stored only as a salted hash. */
export const verificationLogs = mysqlTable(
  "verification_logs",
  {
    id: serial("id").primaryKey(),
    query: varchar("query", { length: 64 }).notNull(),
    found: boolean("found").notNull(),
    certificateId: varchar("certificate_id", { length: 32 }),
    status: varchar("status", { length: 16 }),
    ipHash: varchar("ip_hash", { length: 64 }).notNull(),
    userAgent: varchar("user_agent", { length: 255 }),
    createdAt: createdAt(),
  },
  (t) => [index("verification_logs_ip_idx").on(t.ipHash, t.createdAt), index("verification_logs_cert_idx").on(t.certificateId)],
);

/* ---------------- Learning ---------------- */
export const enrollments = mysqlTable(
  "enrollments",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: varchar("user_id", { length: 64 }).notNull(),
    courseId: varchar("course_id", { length: 64 }).notNull(),
    mode: mysqlEnum("mode", ["online", "offline", "hybrid"]).notNull(),
    enrolledAt: day("enrolled_at").notNull(),
    progress: int("progress").notNull().default(0),
    completedLessons: int("completed_lessons").notNull().default(0),
    totalLessons: int("total_lessons").notNull().default(0),
    lastAccessedAt: day("last_accessed_at").notNull(),
    /** pending = waiting for payment confirmation */
    status: mysqlEnum("status", ["pending", "active", "completed", "paused"]).notNull(),
    nextLessonTitle: varchar("next_lesson_title", { length: 255 }),
    certificateId: varchar("certificate_id", { length: 32 }),
  },
  (t) => [index("enrollments_user_idx").on(t.userId)],
);

/** Completed lessons per learner (lesson ids come from the course curriculum in courses.json). */
export const lessonProgress = mysqlTable(
  "lesson_progress",
  {
    userId: varchar("user_id", { length: 64 }).notNull(),
    lessonId: varchar("lesson_id", { length: 64 }).notNull(),
    courseId: varchar("course_id", { length: 64 }).notNull(),
    completedAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.lessonId] }), index("lesson_progress_course_idx").on(t.userId, t.courseId)],
);

/** Assessment definitions per course. Each learner's attempt is a row in `submissions`. */
export const assessments = mysqlTable(
  "assessments",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    courseId: varchar("course_id", { length: 64 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    type: mysqlEnum("type", ["quiz", "exam", "practical", "assignment"]).notNull(),
    dueDate: day("due_date").notNull(),
    maxScore: int("max_score").notNull(),
  },
  (t) => [index("assessments_course_idx").on(t.courseId)],
);

export const submissions = mysqlTable(
  "submissions",
  {
    id: serial("id").primaryKey(),
    assessmentId: varchar("assessment_id", { length: 64 }).notNull(),
    userId: varchar("user_id", { length: 64 }).notNull(),
    courseId: varchar("course_id", { length: 64 }).notNull(),
    content: text("content"),
    link: varchar("link", { length: 500 }),
    status: mysqlEnum("status", ["submitted", "graded"]).notNull().default("submitted"),
    score: int("score"),
    feedback: text("feedback"),
    gradedBy: varchar("graded_by", { length: 64 }),
    submittedAt: createdAt(),
    gradedAt: datetime("graded_at"),
  },
  (t) => [uniqueIndex("submissions_unique").on(t.assessmentId, t.userId), index("submissions_course_idx").on(t.courseId, t.status)],
);

export const payments = mysqlTable(
  "payments",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: varchar("user_id", { length: 64 }).notNull(),
    courseId: varchar("course_id", { length: 64 }).notNull(),
    amount: int("amount").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("BDT"),
    method: varchar("method", { length: 32 }).notNull(),
    status: mysqlEnum("status", ["paid", "pending", "refunded", "failed"]).notNull(),
    date: day("date").notNull(),
    invoiceNo: varchar("invoice_no", { length: 40 }).notNull().unique(),
    enrollmentId: varchar("enrollment_id", { length: 64 }),
    /** bKash / Nagad / bank transaction ID entered by the learner */
    transactionRef: varchar("transaction_ref", { length: 64 }),
    verifiedBy: varchar("verified_by", { length: 64 }),
    verifiedAt: datetime("verified_at"),
    note: varchar("note", { length: 255 }),
  },
  (t) => [index("payments_user_idx").on(t.userId)],
);

export const notifications = mysqlTable(
  "notifications",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: varchar("user_id", { length: 64 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    body: text("body").notNull(),
    type: mysqlEnum("type", ["course", "assessment", "certificate", "payment", "system"]).notNull(),
    /** ISO date-time string, as in the domain type. */
    createdAtIso: varchar("created_at_iso", { length: 25 }).notNull(),
    read: boolean("read").notNull().default(false),
    href: varchar("href", { length: 255 }),
  },
  (t) => [index("notifications_user_idx").on(t.userId)],
);

/* ---------------- Inbound forms ---------------- */
export const contactMessages = mysqlTable(
  "contact_messages",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 191 }).notNull(),
    email: varchar("email", { length: 191 }).notNull(),
    phone: varchar("phone", { length: 40 }),
    subject: varchar("subject", { length: 191 }).notNull(),
    message: text("message").notNull(),
    status: mysqlEnum("status", ["new", "read", "archived"]).notNull().default("new"),
    ipHash: varchar("ip_hash", { length: 64 }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("contact_messages_ip_idx").on(t.ipHash, t.createdAt)],
);

export const partnerApplications = mysqlTable(
  "partner_applications",
  {
    id: serial("id").primaryKey(),
    orgName: varchar("org_name", { length: 191 }).notNull(),
    orgType: varchar("org_type", { length: 64 }).notNull(),
    contactName: varchar("contact_name", { length: 191 }).notNull(),
    email: varchar("email", { length: 191 }).notNull(),
    phone: varchar("phone", { length: 40 }).notNull(),
    district: varchar("district", { length: 100 }).notNull(),
    categoryId: varchar("category_id", { length: 64 }),
    mode: varchar("mode", { length: 16 }),
    about: text("about"),
    status: mysqlEnum("status", ["pending", "approved", "rejected"]).notNull().default("pending"),
    ipHash: varchar("ip_hash", { length: 64 }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("partner_applications_ip_idx").on(t.ipHash, t.createdAt)],
);

/** A training partner asks NYTI to certify an offline batch. */
export const certificationRequests = mysqlTable(
  "certification_requests",
  {
    id: serial("id").primaryKey(),
    partnerId: varchar("partner_id", { length: 64 }).notNull(),
    courseId: varchar("course_id", { length: 64 }).notNull(),
    batch: varchar("batch", { length: 64 }).notNull(),
    learners: json("learners").$type<{ name: string; email?: string }[]>().notNull(),
    status: mysqlEnum("status", ["pending", "approved", "rejected"]).notNull().default("pending"),
    note: text("note"),
    submittedBy: varchar("submitted_by", { length: 64 }).notNull(),
    reviewedBy: varchar("reviewed_by", { length: 64 }),
    reviewedAt: datetime("reviewed_at"),
    createdAt: createdAt(),
  },
  (t) => [index("certification_requests_partner_idx").on(t.partnerId, t.status)],
);

/* ---------------- Internal ---------------- */
/** Key/value flags, e.g. when the one-time JSON import ran. */
export const appMeta = mysqlTable("app_meta", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: datetime("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
