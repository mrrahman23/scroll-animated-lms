# NYTI — National Youth Training Institute LMS

Frontend for NYTI's training, certification and public certificate-verification platform.
Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Lucide icons.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

## Structure

```
src/
  types/            Domain models (User, Course, Partner, Certificate, …) + content.ts (JSON file shapes)
  lib/
    api.ts          Data-access layer. Every page reads through here (from /data JSON); swap bodies for fetch()
    content.ts      JSON loader (clear errors for malformed files)
    verification.ts Certificate lookup; returns public-safe fields only
    filters.ts      Course / partner filtering, sorting, pagination (no UI logic in components)
    qr.ts           Server-side QR generation (links to /verify-certificate?id=…)
  components/
    ui/             Design system: Button, Badge, Card, Tabs, Accordion, Modal, DataTable,
                    Pagination, ProgressBar, Counter, Toast, form fields
    layout/         Navbar, Footer, Logo, nav config
    home/           Homepage sections + LearnCertifyVerify identity motif
    course/ partner/ certificate/   Domain components
    dashboard/      AppShell + per-role portal config (student, instructor, partner, admin)
    admin/          Charts, certificate registry, users, inbox, payments, requests
  app/
    (site)/         Public site (home, courses, partners, verify-certificate, about, contact, …)
    (auth)/         Login / register
    dashboard/      Student portal
    instructor/ partner-portal/ admin/   Role portals
    api/certificates/verify   GET ?id=  →  VerificationResult JSON
```

## Storage: JSON content + MySQL records (hybrid)

- **Content** (site, pages, courses, categories, instructors, partners, news, stats) — JSON in `/data`.
- **Records** (users, sessions, certificates + history, verification log, enrolments, lesson
  progress, assessment submissions, payments, notifications, contact messages, partner
  applications, certification requests) — MySQL when `DATABASE_URL` is set, otherwise the JSON
  files (read-only demo). See `src/lib/api.ts` and `src/lib/services/`.
- Schema: `src/lib/db/schema.ts` (Drizzle ORM, `mysql2` driver — pure JS, works on cPanel).
  After editing it run `npm run db:generate`; migrations in `/drizzle` apply automatically
  on server start (`src/instrumentation.ts`), followed by a one-time import of the JSON records.
- `GET /api/health` reports database status. Copy `.env.example` → `.env.local` for local MySQL.

## Content lives in `/data` (JSON)

All site content — courses, partners, certificates, news, contact details, menus, page text and
dashboard figures — is read from JSON files in [`data/`](data/README.md). Admins edit them in
**Admin → Website** (`src/app/admin/content`, `src/lib/content-admin`): forms generated from each
file plus hints in `registry.ts`, validation shared with `npm run check-data`
(`src/lib/content-rules.mjs`), atomic writes, edit-conflict detection and version history.
Pages render per request, so changes show immediately. The cPanel package ships content as
`data-initial/` and the server only adds missing files to `data/`, so redeploys keep live edits.

## Demo data

Sample certificate IDs: `NYTI-2026-000123` (valid), `NYTI-2023-004210` (expired),
`NYTI-2025-002977` (revoked). Any other well-formed ID returns "not found".

Without `DATABASE_URL`, login accepts anything and the "Sign in as" selector routes to each
role's portal (demo mode; nothing is saved). With MySQL, sign-in is real: students register,
the first admin comes from `ADMIN_EMAIL`/`ADMIN_PASSWORD`, and the admin creates instructor and
partner accounts. See [docs/DEPLOY-CPANEL.md](docs/DEPLOY-CPANEL.md).
Stats, testimonials, leadership names and contact details are placeholders.

## UI themes

Seven themes share the same pages and content:

| Theme | Look | Motion |
|---|---|---|
| **Classic** | Navy, serif headings, certificate details | Subtle fades and counters |
| **Aurora** | Dark neon, glass cards | Three.js particle galaxy + knowledge core, holographic 3D medal, pointer spotlight on cards, confetti |
| **Spark** | Bright, chunky sticker cards | Three.js floating shapes + graduation cap (click to pop), gold 3D medal, card tilt, confetti |
| **Ember** | Cinematic night, warm uppercase type | Full-page Three.js world (moon, institute hall, lamp-lit path, grass, drifting leaves, mist) that the camera travels through as you scroll; film grain, cursor ring, copper 3D medal |
| **Lunar** | Cold moonlit night, silver-blue accents | The same night world as Ember in silver and ice (pale moon, frosted trees, snow-like flecks), silver 3D medal |
| **Quest** | Neon tech world, mono type, scanlines | Scroll-driven story: a student walks through a portal, collects skill cubes past floating code, passes an assessment gate, and is certified on a podium as a holographic certificate rises (finale plays in the homepage `worldWindow` section) |
| **Lab** | Bright modern tech lab, light UI | Scroll-driven story: glass doors slide open, lesson workstations fill their progress bars (✓ badges), robot arm & holo table, an assessment screen ticks answers to PASSED, and the certificate wall reveals with confetti |

**Setting the theme**
- **Admin → Settings → Appearance** (`/admin/settings`) sets the site-wide default and whether visitors
  may switch. Saved to `data/site-settings.json` and applied to all pages immediately.
- Fallback when that file is missing: env `NYTI_UI_THEME=classic|aurora|spark`.
- If switching is allowed, visitors get a floating **Theme** button; their choice is stored in their browser.

**How it works**
- `src/app/themes.css` re-maps the design tokens per theme (`html[data-ui="…"]`). Every Tailwind colour
  utility reads a CSS variable, so all pages re-skin without per-page code.
- Mark large dark surfaces with `island` and certificate artwork with `paper` so the dark theme keeps them correct.
- Theme-only styling in markup: `aurora:…`, `spark:…`, `classic:…`, `fancy:…` (aurora or spark).
- Cards opt into effects with `fx-card`; buttons get `btn-<variant>` automatically.
- 3D scenes: `src/components/three/` (Quest & Lab share the student and story timing in `scenes/shared.ts`) (`useThreeScene` handles resize, pausing off-screen, reduced motion,
  WebGL fallback and cleanup). three.js is code-split and only downloaded on Aurora/Spark.
- Verification fires a `nyti:verified` window event; the medal and confetti listen for it.

## Connecting a backend

1. Replace function bodies in `src/lib/api.ts` with API calls (types stay the same), or keep JSON for page text.
2. Point `verifyCertificate` at the registry service.
3. Form handlers marked `TODO` (enrol, contact, partner application, issue/revoke) need endpoints.
4. Add real auth and derive the role from the session instead of the login selector.
5. Protect the `saveAppearance` server action (`src/app/admin/settings/actions.ts`) to admins only.
