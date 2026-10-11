/**
 * Rules for the content files in /data, shared by `npm run check-data` and the admin editors
 * (so the website can't be saved into a state the check would reject).
 *
 * @param {Record<string, any>} d  Parsed files keyed by name without ".json" (e.g. "courses", "pages/home")
 * @param {(src: string) => boolean} imageExists  Whether a local image path ("/images/…", "/uploads/…") exists
 * @returns {{ errors: string[], warnings: string[] }}
 */
export function checkContent(d, imageExists) {
  const errors = [];
  const warnings = [];
  const list = (k) => (Array.isArray(d[k]) ? d[k] : []);

  for (const k of ["categories", "instructors", "courses", "partners", "news", "testimonials"]) {
    if (d[k] !== undefined && !Array.isArray(d[k])) errors.push(`${k}.json must be a list`);
  }
  const categories = list("categories");
  const instructors = list("instructors");
  const courses = list("courses");
  const partners = list("partners");
  const certificates = list("certificates");
  const users = d.users ?? {};
  const portals = d.portals ?? {};

  const ids = (l) => new Set(l.map((x) => x?.id));
  const catIds = ids(categories), insIds = ids(instructors), courseIds = ids(courses), partnerIds = ids(partners);

  const unique = (l, key, file) => {
    const seen = new Set();
    for (const x of l) {
      if (x?.[key] === undefined || x[key] === "") errors.push(`${file}: an item has no ${key}`);
      else if (seen.has(x[key])) errors.push(`${file}: duplicate ${key} "${x[key]}"`);
      seen.add(x?.[key]);
    }
  };
  const ref = (file, owner, field, value, set) => {
    if (value !== undefined && !set.has(value)) errors.push(`${file}: ${owner} → ${field} "${value}" does not exist`);
  };
  const slugOk = (file, x) => {
    if (typeof x.slug === "string" && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(x.slug)) errors.push(`${file}: "${x.slug}" — a slug may only use lowercase letters, numbers and dashes`);
  };

  unique(categories, "id", "categories.json");
  unique(instructors, "id", "instructors.json");
  unique(courses, "id", "courses.json");
  unique(courses, "slug", "courses.json");
  unique(partners, "id", "partners.json");
  unique(partners, "slug", "partners.json");
  unique(list("news"), "slug", "news.json");
  unique(certificates, "id", "certificates.json");
  [...courses, ...partners, ...list("news"), ...categories].forEach((x) => x && slugOk("content", x));

  const lessonIds = new Set();
  for (const c of courses) {
    ref("courses.json", c.id, "categoryId", c.categoryId, catIds);
    if (c.instructorId) ref("courses.json", c.id, "instructorId", c.instructorId, insIds);
    (c.partnerIds ?? []).forEach((p) => ref("courses.json", c.id, "partnerIds", p, partnerIds));
    for (const k of ["slug", "title", "modes", "price", "curriculum", "thumbnail"]) if (c[k] === undefined) errors.push(`courses.json: ${c.id} is missing "${k}"`);
    if (typeof c.price !== "number" || c.price < 0) errors.push(`courses.json: ${c.id} price must be 0 (free) or more`);
    if (Array.isArray(c.modes) && c.modes.length === 0) errors.push(`courses.json: ${c.id} needs at least one mode (online/offline)`);
    for (const m of c.curriculum ?? []) {
      if (!m.title) errors.push(`courses.json: ${c.id} has a module without a title`);
      for (const l of m.lessons ?? []) {
        if (!l.id) errors.push(`courses.json: ${c.id} has a lesson without an id`);
        else if (lessonIds.has(l.id)) errors.push(`courses.json: lesson id "${l.id}" is used twice`);
        lessonIds.add(l.id);
        if (!l.title) errors.push(`courses.json: ${c.id} has a lesson without a title`);
      }
    }
  }
  for (const p of partners) {
    (p.courseIds ?? []).forEach((c) => ref("partners.json", p.id, "courseIds", c, courseIds));
    (p.categoryIds ?? []).forEach((c) => ref("partners.json", p.id, "categoryIds", c, catIds));
    if (p.status && !["active", "pending", "suspended"].includes(p.status)) errors.push(`partners.json: ${p.id} has unknown status "${p.status}"`);
  }
  for (const c of certificates) {
    ref("certificates.json", c.id, "courseId", c.courseId, courseIds);
    ref("certificates.json", c.id, "issuedByPartnerId", c.issuedByPartnerId, partnerIds);
    if (!/^NYTI-\d{4}-\d{6}$/.test(c.id)) errors.push(`certificates.json: "${c.id}" must look like NYTI-2026-000123`);
    if (!["valid", "expired", "revoked"].includes(c.status)) errors.push(`certificates.json: ${c.id} has unknown status "${c.status}"`);
  }
  list("enrollments").forEach((e) => ref("enrollments.json", e.id, "courseId", e.courseId, courseIds));
  list("assessments").forEach((a) => ref("assessments.json", a.id, "courseId", a.courseId, courseIds));
  list("payments").forEach((p) => ref("payments.json", p.id, "courseId", p.courseId, courseIds));
  if (users.instructor) ref("users.json", "instructor", "instructorId", users.instructor.instructorId, insIds);
  if (users.partner) ref("users.json", "partner", "partnerId", users.partner.partnerId, partnerIds);
  (portals.instructor?.gradingQueue ?? []).forEach((q) => ref("portals.json", q.student, "courseId", q.courseId, courseIds));
  (portals.partner?.certificationRequests ?? []).forEach((r) => ref("portals.json", r.batch, "courseId", r.courseId, courseIds));

  for (const c of courses) {
    const seen = new Set();
    for (const s of c.subjects ?? []) {
      if (!s.name) errors.push(`courses.json: ${c.id} has a subject without a name`);
      if (s.id && seen.has(s.id)) errors.push(`courses.json: ${c.id} subject id "${s.id}" is used twice`);
      seen.add(s.id);
      if (typeof s.fullMarks === "number" && s.fullMarks <= 0) errors.push(`courses.json: ${c.id} → "${s.name}" full marks must be more than 0`);
    }
  }
  if (d.grading) {
    const scale = Array.isArray(d.grading.scale) ? d.grading.scale : [];
    if (!scale.length) errors.push("grading.json: add at least one grade");
    if (!scale.some((g) => g.minMarks === 0)) errors.push("grading.json: one grade must start at 0 marks (usually F)");
    if (new Set(scale.map((g) => g.grade)).size !== scale.length) errors.push("grading.json: each grade can only appear once");
    if (d.grading.failGrade && !scale.some((g) => g.grade === d.grading.failGrade)) errors.push(`grading.json: failing grade "${d.grading.failGrade}" is not in the scale`);
  }

  if (d.site) {
    for (const k of ["name", "shortName", "url"]) if (!d.site[k]) errors.push(`site.json: "${k}" can't be empty`);
  }

  // Image fields: empty = fallback artwork; otherwise a local path that exists, or an https URL
  const checkImage = (file, owner, field, value) => {
    if (value === undefined || value === "" || value === null) return;
    if (typeof value !== "string") return errors.push(`${file}: ${owner} → ${field} must be text`);
    if (/^https?:\/\//i.test(value)) {
      if (value.startsWith("http://")) warnings.push(`${file}: ${owner} → ${field} uses http:// — prefer https:// so browsers don't block it`);
      return;
    }
    if (!value.startsWith("/")) return errors.push(`${file}: ${owner} → ${field} "${value}" must start with "/" (an uploaded or /public file) or "https://"`);
    if (!imageExists(value)) errors.push(`${file}: ${owner} → ${field} "${value}" was not found`);
  };
  courses.forEach((c) => checkImage("courses.json", c.id, "image", c.image));
  partners.forEach((p) => checkImage("partners.json", p.id, "logo", p.logo));
  if (d.site) {
    checkImage("site.json", "site", "logo", d.site.logo);
    checkImage("site.json", "site", "logoOnDark", d.site.logoOnDark);
  }

  for (const cat of categories) if (!courses.some((c) => c.categoryId === cat.id)) warnings.push(`categories.json: "${cat.name}" has no courses yet`);

  return { errors, warnings };
}
