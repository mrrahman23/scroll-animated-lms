/**
 * The content files admins can edit from Admin → Website, and how their fields are shown.
 * Safe to import from client components (no Node APIs).
 *
 * Hint keys are field paths with `*` for list positions, e.g. "curriculum.*.lessons.*.type".
 */

/** Option lists filled in on the server from the other content files. */
export type OptionSource = "categories" | "instructors" | "partners" | "courses" | "icons";
export type Option = { value: string; label: string };

export interface FieldHint {
  label?: string;
  help?: string;
  widget?: "text" | "textarea" | "image" | "select" | "multiselect" | "date" | "readonly" | "hidden";
  options?: Option[] | OptionSource;
  /** Shape of a new item when the list is empty (otherwise the first item is used as the pattern). */
  itemTemplate?: unknown;
}

export interface ContentDef {
  /** URL segment: /admin/content/<key> */
  key: string;
  /** File in /data without ".json" */
  file: string;
  label: string;
  description: string;
  group: "Website" | "Catalogue" | "Page text";
  kind: "collection" | "document";
  /** Collections */
  singular?: string;
  titleField?: string;
  columns?: { field: string; label: string }[];
  /** New records: id prefix and the field the slug is made from */
  idPrefix?: string;
  slugFrom?: string;
  /** Collections: a new record. Documents: fields added when missing from the file. */
  template?: Record<string, unknown>;
  /** Public page for a record or the document, to open after saving */
  publicHref?: (record: Record<string, unknown>) => string | null;
  hints?: Record<string, FieldHint>;
}

const opts = (...values: string[]): Option[] => values.map((v) => ({ value: v, label: v }));
const MODES: Option[] = [
  { value: "online", label: "Online" },
  { value: "offline", label: "Offline" },
  { value: "hybrid", label: "Hybrid" },
];

const LESSON = { id: "", title: "", type: "video", durationMinutes: 10, isPreview: false };

export const CONTENT: ContentDef[] = [
  {
    key: "site",
    file: "site",
    label: "Site information",
    description: "Name, logo, contact details, social links, menus, payment details and footer.",
    group: "Website",
    kind: "document",
    publicHref: () => "/",
    // Fields added in later versions, so an older site.json on the server shows them too
    template: { logo: "", logoOnDark: "", showNameWithLogo: true },
    hints: {
      name: { label: "Organisation name" },
      shortName: { label: "Short name", help: "Shown next to the logo, e.g. NYTI." },
      url: { label: "Website address", help: "Full address with https://. Used in certificate QR codes and links." },
      logo: { widget: "image", label: "Logo", help: "PNG, SVG or WebP. Leave empty to use the built-in NYTI shield." },
      logoOnDark: { widget: "image", label: "Logo for dark backgrounds", help: "Optional light version used in the footer and portals. If empty, the logo is shown on a white badge." },
      showNameWithLogo: { label: "Show the name next to the logo", help: "Turn off if your logo image already contains the name." },
      announcement: { label: "Announcement bar" },
      "contact.addressLines": { label: "Address (one line per row)" },
      "contact.mapEmbedUrl": { label: "Google Maps embed URL", help: "Google Maps → Share → Embed a map → copy the src=\"…\" address. Leave empty for a placeholder." },
      "social.*.platform": { widget: "select", options: opts("facebook", "linkedin", "youtube", "x") },
      "payments.methods.*.method": { widget: "select", options: opts("bKash", "Nagad", "Bank Transfer") },
      "payments.methods.*.details": { label: "Account details shown to learners" },
      "verification.samples": { label: "Sample IDs shown on the verify page" },
      "navigation.footer.*.links": { itemTemplate: { label: "", href: "/" } },
    },
  },
  {
    key: "courses",
    file: "courses",
    label: "Courses",
    singular: "course",
    description: "Course details, prices, images and curriculum.",
    group: "Catalogue",
    kind: "collection",
    titleField: "title",
    columns: [
      { field: "level", label: "Level" },
      { field: "price", label: "Price (BDT)" },
      { field: "nextIntake", label: "Next intake" },
    ],
    idPrefix: "c",
    slugFrom: "title",
    publicHref: (r) => (r.slug ? `/courses/${r.slug}` : null),
    template: {
      title: "",
      slug: "",
      shortDescription: "",
      description: "",
      image: "",
      imageAlt: "",
      categoryId: "",
      instructorId: "",
      modes: ["online"],
      level: "Beginner",
      durationWeeks: 8,
      hoursPerWeek: 5,
      language: "Bangla & English",
      price: 0,
      certificate: true,
      featured: false,
      nextIntake: "",
      outcomes: [""],
      requirements: [""],
      partnerIds: [],
      thumbnail: { hue: "navy", icon: "monitor" },
      curriculum: [{ id: "", title: "Module 1", lessons: [{ ...LESSON, title: "Welcome" }] }],
      subjects: [],
      hidden: false,
      students: 0,
      rating: 0,
      reviewCount: 0,
    },
    hints: {
      slug: { help: "The web address: /courses/<slug>. Lowercase letters, numbers and dashes. Changing it breaks old links." },
      shortDescription: { widget: "textarea", label: "Short description", help: "One or two sentences for course cards." },
      image: { widget: "image", label: "Cover image", help: "Leave empty to use generated artwork (see Thumbnail)." },
      imageAlt: { label: "Cover image description", help: "Describes the photo for screen readers." },
      categoryId: { widget: "select", options: "categories", label: "Category" },
      instructorId: { widget: "select", options: "instructors", label: "Instructor" },
      modes: { widget: "multiselect", options: MODES, label: "Delivery modes" },
      level: { widget: "select", options: opts("Beginner", "Intermediate", "Advanced", "All Levels") },
      price: { label: "Price (BDT)", help: "0 = free. Paid courses are enrolled by bKash / Nagad / bank transfer and confirmed in Payments." },
      certificate: { label: "Awards a certificate" },
      featured: { label: "Featured on the homepage" },
      nextIntake: { widget: "date", label: "Next intake date" },
      partnerIds: { widget: "multiselect", options: "partners", label: "Offline training partners" },
      "thumbnail.hue": { widget: "select", options: opts("navy", "blue", "teal", "indigo", "slate", "sky"), label: "Artwork colour" },
      "thumbnail.icon": { widget: "select", options: "icons", label: "Artwork icon" },
      thumbnail: { label: "Generated artwork (used when there is no cover image)" },
      curriculum: { help: "Removing a lesson also removes it from learners' progress.", itemTemplate: { id: "", title: "", lessons: [LESSON] } },
      "curriculum.*.lessons": { itemTemplate: LESSON },
      "curriculum.*.lessons.*.type": { widget: "select", options: opts("video", "reading", "quiz", "assignment", "practical") },
      "curriculum.*.lessons.*.durationMinutes": { label: "Minutes" },
      "curriculum.*.lessons.*.isPreview": { label: "Free preview" },
      hidden: { label: "Hidden from the course catalogue", help: "For programmes that only issue results (e.g. diplomas). The course page still works by direct link." },
      subjects: {
        label: "Mark sheet subjects",
        help: "The subjects results are entered for (Admin → Results). Semester 0 = no semesters. Renaming is fine; removing a subject removes it from unpublished results.",
        itemTemplate: { id: "", semester: 0, code: "", name: "", fullMarks: 100 },
      },
      "subjects.*.fullMarks": { label: "Full marks" },
      students: { label: "Students (shown publicly)" },
      rating: { label: "Rating (0–5, shown publicly)" },
      reviewCount: { label: "Number of reviews (shown publicly)" },
    },
  },
  {
    key: "categories",
    file: "categories",
    label: "Course categories",
    singular: "category",
    description: "The categories courses are grouped into.",
    group: "Catalogue",
    kind: "collection",
    titleField: "name",
    columns: [{ field: "slug", label: "Slug" }],
    idPrefix: "cat",
    slugFrom: "name",
    template: { name: "", slug: "", description: "", icon: "monitor", courseCount: 0 },
    hints: {
      icon: { widget: "select", options: "icons" },
      courseCount: { label: "Course count (shown publicly)" },
    },
  },
  {
    key: "instructors",
    file: "instructors",
    label: "Instructors",
    singular: "instructor",
    description: "Instructor profiles shown on course pages.",
    group: "Catalogue",
    kind: "collection",
    titleField: "name",
    columns: [{ field: "title", label: "Title" }],
    idPrefix: "ins",
    template: { name: "", title: "", initials: "", bio: "", rating: 0, students: 0 },
    hints: {
      title: { label: "Job title" },
      initials: { help: "Two letters for the avatar, e.g. FK." },
      bio: { widget: "textarea" },
    },
  },
  {
    key: "partners",
    file: "partners",
    label: "Training partners",
    singular: "partner",
    description: "Authorized partner directory, logos and status.",
    group: "Catalogue",
    kind: "collection",
    titleField: "name",
    columns: [
      { field: "city", label: "City" },
      { field: "authorizationNumber", label: "Authorization no." },
      { field: "status", label: "Status" },
    ],
    idPrefix: "p",
    slugFrom: "name",
    publicHref: (r) => (r.slug && r.status === "active" ? `/partners/${r.slug}` : null),
    template: {
      name: "",
      slug: "",
      shortName: "",
      logo: "",
      type: "Training Center",
      city: "",
      district: "",
      address: "",
      phone: "",
      email: "",
      website: "",
      authorizationNumber: "",
      status: "pending",
      since: new Date().getFullYear(),
      modes: ["offline"],
      categoryIds: [],
      courseIds: [],
      facilities: [""],
      certificatesIssued: 0,
      studentsTrained: 0,
      description: "",
    },
    hints: {
      logo: { widget: "image", help: "Shown in the partner directory and the logo carousel." },
      type: { widget: "select", options: opts("Technical Institute", "Training Center", "College", "NGO", "Corporate Academy") },
      status: { widget: "select", options: opts("active", "pending", "suspended"), help: "Only active partners appear on the public site." },
      since: { label: "Partner since (year)" },
      modes: { widget: "multiselect", options: MODES, label: "Delivery modes" },
      categoryIds: { widget: "multiselect", options: "categories", label: "Categories" },
      courseIds: { widget: "multiselect", options: "courses", label: "Courses offered" },
      authorizationNumber: { label: "Authorization number" },
      certificatesIssued: { label: "Certificates issued (shown publicly)" },
      studentsTrained: { label: "Students trained (shown publicly)" },
      description: { widget: "textarea" },
    },
  },
  {
    key: "news",
    file: "news",
    label: "News & announcements",
    singular: "news item",
    description: "News posts on the homepage and the News page.",
    group: "Website",
    kind: "collection",
    titleField: "title",
    columns: [
      { field: "date", label: "Date" },
      { field: "category", label: "Category" },
    ],
    idPrefix: "nw",
    slugFrom: "title",
    publicHref: (r) => (r.slug ? `/news/${r.slug}` : null),
    template: { title: "", slug: "", category: "Programs", date: new Date().toISOString().slice(0, 10), excerpt: "", body: [""] },
    hints: {
      category: { widget: "select", options: opts("Course Launch", "Upcoming Training", "Ceremony", "Partners", "Programs", "Workshop") },
      date: { widget: "date" },
      excerpt: { widget: "textarea", help: "Summary shown on news cards." },
      body: { label: "Paragraphs" },
      "body.*": { widget: "textarea" },
    },
  },
  {
    key: "testimonials",
    file: "testimonials",
    label: "Testimonials",
    singular: "testimonial",
    description: "Learner quotes shown on the homepage.",
    group: "Website",
    kind: "collection",
    titleField: "name",
    columns: [{ field: "courseTitle", label: "Course" }],
    idPrefix: "t",
    template: { name: "", courseTitle: "", location: "", isSample: false, quote: "" },
    hints: {
      quote: { widget: "textarea" },
      isSample: { label: "Sample (placeholder) testimonial", help: "Untick for real testimonials." },
    },
  },
  {
    key: "grading",
    file: "grading",
    label: "Grading scale",
    description: "How marks become letter grades and grade points on mark sheets.",
    group: "Catalogue",
    kind: "document",
    hints: {
      scale: { label: "Grades (highest first)", help: "A subject gets the first grade whose minimum marks (in %) it reaches.", itemTemplate: { minMarks: 0, grade: "", gradePoint: 0 } },
      "scale.*.minMarks": { label: "Minimum marks (%)" },
      "scale.*.gradePoint": { label: "Grade point" },
      failGrade: { label: "Failing grade", help: "Students with this grade in any subject don't receive a certificate." },
    },
  },
  {
    key: "stats",
    file: "stats",
    label: "Statistics",
    description: "The headline numbers on the homepage and About page.",
    group: "Website",
    kind: "document",
    publicHref: () => "/",
    hints: {
      "platform.*.key": { widget: "readonly" },
      platform: { itemTemplate: { key: "", value: 0, suffix: "+", label: "" } },
    },
  },
];

/** Page text files (data/pages/*.json) are discovered on the server; this builds their entry. */
export function pageDef(name: string): ContentDef {
  const label = name.split("-").map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ");
  const href = name === "home" ? "/" : name === "legal" ? "/terms" : `/${name}`;
  return {
    key: `page-${name}`,
    file: `pages/${name}`,
    label: `${label} page`,
    description: `Headings and text on ${href}.`,
    group: "Page text",
    kind: "document",
    publicHref: () => href,
  };
}

/** Hint lookup: "curriculum.3.lessons.0.type" matches "curriculum.*.lessons.*.type". */
export function hintFor(hints: Record<string, FieldHint> | undefined, path: (string | number)[]): FieldHint {
  if (!hints) return {};
  return hints[path.map((p) => (typeof p === "number" ? "*" : p)).join(".")] ?? {};
}
