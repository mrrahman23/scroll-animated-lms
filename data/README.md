# Site content (JSON)

Everything the website shows comes from the files in this folder. The easiest way to change them is
**Admin → Website** (sign in as an admin): forms for every file, image uploads, checks before saving
and a version history. You can also edit a file directly; the site shows it on the next page load.

`.history/` (saved versions) and `uploads/` (uploaded images) are created by the admin editor.

> **When MySQL is connected** (`DATABASE_URL` set), these files become a one-time import and are
> then **not read any more**: `users.json`, `certificates.json`, `enrollments.json`,
> `assessments.json`, `payments.json`, `notifications.json`. Change those records in the
> database instead. Every other file here keeps working exactly as before.

Before uploading changes, run:

```bash
npm run check-data
```

It checks every file for JSON mistakes (missing commas, quotes) and broken links between files
(for example a course pointing to a category that doesn't exist).

## Files

| File | What it controls |
|---|---|
| `site.json` | Organisation name, tagline, SEO text, **phone, email, address, office hours**, Google Maps embed, social links, menus, footer text, certificate signatory, sample certificate IDs |
| `site-settings.json` | UI theme — managed from **Admin → Settings** (you can also edit it here) |
| `categories.json` | Course categories |
| `courses.json` | Courses, including `image`, curriculum, price, modes, outcomes |
| `instructors.json` | Instructors |
| `partners.json` | Authorized training partners (incl. `logo`) |
| `certificates.json` | Certificate registry used by public verification |
| `news.json` | News & announcements |
| `testimonials.json` | Learner testimonials (set `"isSample": false` for real ones) |
| `stats.json` | Homepage/About statistics (10,000+ learners, etc.) |
| `users.json` | Demo accounts shown in the portals, incl. student learning hours |
| `enrollments.json`, `assessments.json`, `payments.json`, `notifications.json` | Student dashboard records |
| `admin.json` | Admin dashboard totals, trends, monthly chart data, recent activity |
| `portals.json` | Instructor grading queue and partner certification requests |
| `pages/*.json` | Text for each page — `home.json`, `about.json`, `help.json` (FAQ), `contact.json`, `legal.json`, … named after the page URL |

## Tips

- **IDs link files together.** A course's `categoryId` must match an `id` in `categories.json`;
  `instructorId` → `instructors.json`; `partnerIds` → `partners.json`. Certificates use `courseId`.
- **Slugs are URLs.** `"slug": "professional-graphic-design"` becomes `/courses/professional-graphic-design`.
  Keep them lowercase with dashes, and unique.
- **Dates** use `YYYY-MM-DD` (e.g. `"2026-10-12"`).
- **Certificate IDs** use `NYTI-YYYY-NNNNNN`.
- **Icons** (`"icon": "award"`): allowed names are listed in `src/components/ui/Icon.tsx`
  (e.g. `award`, `laptop`, `shield-check`, `book-open`, `briefcase`, `users`, `palette`, `code`).
- **Google Maps:** in Google Maps choose *Share → Embed a map*, copy the `src="…"` URL into
  `site.json → contact.mapEmbedUrl`.
## Images

**Course images** — in `courses.json` set `"image"` (and a short description in `"imageAlt"`):

```json
"image": "/images/courses/graphic-design.jpg",
"imageAlt": "Students working on a design project"
```

Leave `"image": ""` to use the generated artwork (from `thumbnail.hue` and `thumbnail.icon`).
Best size: 1200 × 675 px (16:9), JPG or WebP.

**Partner logos** — in `partners.json` set `"logo"`. Partners without a logo show their initials.
Logos appear on partner cards, the partner page and the sliding logo carousel.
SVG or a transparent PNG works best (about 500 × 160 px). The current logos in
`public/images/partners/` are placeholders.

Both fields accept either:

- a file you put in the `public/` folder, written from `/` — e.g. file `public/images/courses/x.jpg`
  → `"/images/courses/x.jpg"`. These are automatically resized and compressed (recommended), or
- a full `https://` link to an image hosted elsewhere (shown as-is).

**Logo carousel** — turn it on/off, change its heading or speed in
`pages/home.json → partners.logoCarousel` (`"seconds"` = time for one full loop; bigger is slower).
