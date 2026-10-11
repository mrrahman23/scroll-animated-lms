# Deploying NYTI to cPanel (Node.js app)

Tested package: `npm run package:cpanel` → `deploy/nyti-cpanel.zip`
(self-contained `server.js`; no `npm install` on the server).

## Requirements
- cPanel **Setup Node.js App** with **Node.js 20.9 or newer** (Next.js 16 requirement).
- A subdomain for the app (e.g. `nyti.yourdomain.com`). Deploying under a sub-path
  (`yourdomain.com/nyti`) needs extra config (`basePath`) — use a subdomain.

## Folder layout (keeps everything under the domain's folder, nothing public)
```
mytest.nytibd.com/
├── www/   ← Document Root of the subdomain (only .htaccess, .well-known, php.ini, .user.ini)
└── app/   ← Application root (server.js, package.json, .next/, data/, public/, node_modules/)
```
The app must **never** sit in the Document Root — files there are downloadable by anyone.

## First deploy
1. **Build** (on your computer): `npm run package:cpanel` → `deploy/nyti-cpanel.zip`
2. **Subdomain**: cPanel → Domains → create `mytest.nytibd.com`, then **Manage** → set
   **Document Root** to `mytest.nytibd.com/www`.
3. **Upload**: File Manager → `mytest.nytibd.com/app` → Upload the zip → Extract → move the
   *contents* of the extracted `nyti-cpanel/` folder up into `app/` (Settings → Show Hidden Files,
   so `.next` is included) → delete the zip and the empty folder.
4. **Create the app**: Setup Node.js App → Create Application
   - Node.js version: **22.x** (needs ≥ 20.9)
   - Application mode: **Production**
   - Application root: `mytest.nytibd.com/app`
   - Application URL: `mytest.nytibd.com` (path empty)
   - Application startup file: `server.js`
   - **Create**. Do **not** click "Run NPM Install" (everything is bundled).
   - Check `app/server.js` is ~7 KB (cPanel must not have replaced it with a sample file).
5. **HTTPS**: cPanel → SSL/TLS Status → Run AutoSSL.
6. **Site URL**: edit `app/data/site.json` → `"url": "https://mytest.nytibd.com"` (QR codes, SEO).

## Updating the site
1. `npm run package:cpanel` again.
2. **Back up** `app/data/` (download it) and, with MySQL, the database. Migrations apply
   automatically on start.
3. Setup Node.js App → **Stop App**. Upload & extract the new zip into `app/` (replace files).
4. **Start / Restart** the app.

The package ships its content as `data-initial/`, never as `data/`, so uploading it **doesn't
touch the live content** (edits made in Admin → Website, uploaded images, the theme).
On start the server only adds files that are missing from `data/` (e.g. a new page in a later
version). To change live content, use the admin, or upload that single file into `app/data/`.

## Fixing "No such application or it's broken"
cPanel's app record points at a folder that no longer exists. Create an empty folder at the path
shown in the error, **Destroy** the app (files are kept), delete that folder, and create the app again.

## Editing content
Sign in as an admin → **Website** (also **Courses** and **Partners** in the sidebar):
site name, logo, contact details, social links, payment numbers, menus, courses (incl.
curriculum and cover images), categories, instructors, partners (incl. logos), news,
testimonials, statistics and the text of every page. Each save is checked (e.g. a course must
point to an existing category), goes live immediately, and is kept in **Version history**
(last 30 per file, in `app/data/.history/`) so it can be restored. Uploaded images are stored in
`app/data/uploads/`.

You can still edit `app/data/*.json` in File Manager — changes show on the next page load.

## Troubleshooting
- **Blank page / 503**: check the Node.js version (≥ 20.9) and that the startup file is `server.js`.
  Look at `stderr.log` in the application root, or the log shown in Setup Node.js App.
- **Styles missing**: `.next/static` didn't upload — re-extract the zip (hidden folders must be kept).
- **"node_modules" warning in Setup Node.js App**: expected; ignore it and don't run NPM Install.

## Connecting MySQL (accounts, learning, certificates)
Without `DATABASE_URL` the site is a **demo**: role-picker login, nothing is saved.
With a database it is the full LMS: real accounts, enrolment and payments, course player,
assessments and grading, automatic certificates, the admin, instructor and partner portals, and
notifications. **Content** (site details, page text, courses, categories, instructors, partners,
news, stats) still comes from `app/data/*.json` — edit those files to change it.

1. **Create the database**: cPanel → **MySQL Database Wizard**
   - Database: e.g. `nyti` (cPanel shows it as `yourcpaneluser_nyti`)
   - User: e.g. `nyti` (→ `yourcpaneluser_nyti`) with a strong password
   - Privileges: **ALL PRIVILEGES** → Make Changes
2. **Upload the latest package** into `app/` as in "Updating the site". It includes the
   `drizzle/` migrations folder.
3. **Environment variables**: Setup Node.js App → edit the app → **Add variable**

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | `mysql://yourcpaneluser_nyti:PASSWORD@localhost:3306/yourcpaneluser_nyti` |
   | `NYTI_SECRET` | a long random string (keep it the same forever) |
   | `ADMIN_EMAIL` | the email you will sign in with as admin |
   | `ADMIN_PASSWORD` | ≥ 8 characters, letters and numbers |
   | `SITE_URL` | `https://mytest.nytibd.com` |

   If the DB password contains special characters, URL-encode them
   (`@`→`%40`, `#`→`%23`, `:`→`%3A`, `/`→`%2F`, `%`→`%25`, `?`→`%3F`, `&`→`%26`).
   Optional email: `SMTP_HOST`, `SMTP_PORT` (465), `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`,
   `ADMIN_NOTIFY_EMAIL` (cPanel → Email Accounts → Connect Devices shows the values).
   **Save**, then **Restart**.
4. **On first start** the app creates/updates its tables, imports the records from
   `app/data/*.json` once, and creates the admin account. Check
   `https://mytest.nytibd.com/api/health`: `"database":"connected"` and an `"importedAt"` time.
   Problems are logged in `app/stderr.log` as `[db] setup failed: …`.
5. **Sign in** at `/login` with `ADMIN_EMAIL` / `ADMIN_PASSWORD`, then change the password in
   Admin → Settings. You can now delete the `ADMIN_PASSWORD` variable (it is ignored once an admin
   has a password).
6. **Accounts**: students register themselves. Create instructor and partner accounts in
   Admin → Users (link each to its instructor/partner record). Users imported from `users.json`
   have no password — set one for them in Admin → Users if they need to sign in.

After the import, `certificates.json`, `users.json`, `enrollments.json`, `assessments.json`,
`payments.json` and `notifications.json` are no longer read; manage those records in the portals.

**Payments**: paid courses are enrolled by sending bKash/Nagad/bank and entering the
transaction ID; an admin confirms it in Admin → Payments. Change the account numbers in
`data/site.json` → `payments`.

**Backups**: cPanel → Backup → download a MySQL database backup regularly (or schedule
`mysqldump` with Cron Jobs). Also keep a copy of `app/data/`.

## Importing results from the old system (verify.nytibd.com)

Each student in the old database becomes a certificate with ID **`NYTI-{roll}-{reg}`**
(e.g. `NYTI-21230-20123`), with the student record and subject-wise mark sheet behind
**Show details** on the Verify page. People can also search by **Reg No. + Roll No.**, as before.
Not imported: date of birth, religion, gender.

1. **Export the old database**: cPanel → phpMyAdmin → `theumcyw_verify` → **Export** → Quick → SQL.
   Keep the `.sql` file private (it holds students' personal details) — don't email it around or
   put it in the website folders.
2. **Import**: sign in as admin → **Certificates → Import old results** → choose the file(s) →
   **Read file** → check the preview → choose who issued each institute's certificates
   (NYTI, an existing partner, or *add as a new partner*) → **Import**.
   New partners are created as *pending*: complete them in Partners and set them to *active*.
3. **Add the old courses** (step 3 on the same page): creates the 34 old courses in Courses
   with ID `legacy-{old id}` (the imported certificates already point there) and mark-sheet
   subjects from each course's most recent batch, hidden from the public catalogue and
   offline-only. Category, duration and description are a starting point — complete them in
   Courses later. Courses already in the list are never overwritten. Partners get the courses
   their students took, so they can enter new results for them.
4. **Copy photos and scans** (step 4 on the same page): copies them from the old site into
   `app/data/uploads/legacy/`. Until then they're shown from the old site.
5. **Later updates**: while staff still enter results in the old admin, export again and import
   again. Existing certificates are updated (a revoked certificate stays revoked), new ones are
   added, and the institute choices are remembered. Run step 4 again for the new photos.

### Redirecting the old public links

The old site's public pages were `/search_result` (search form) and `/show_result` (result),
and photos were under `/storage/images/…`. The new site answers all three, so only those paths
need forwarding — the old **admin keeps working** for data entry.

Do this **after** step 4 (photos copied). In cPanel → File Manager → the document root of
`verify.nytibd.com` (Settings → Show Hidden Files) → edit `.htaccess` (inside `public/` for a
Laravel site) and add these lines **at the top**:

```apache
RewriteEngine On
# Old public verification → new site (POST is kept by 307/308, so form submissions still work)
RewriteRule ^search_result/?$ https://mytest.nytibd.com/search_result [R=301,L]
RewriteRule ^show_result/?$ https://mytest.nytibd.com/show_result [R=307,L]
RewriteRule ^storage/(images/.*)$ https://mytest.nytibd.com/storage/$1 [R=301,L]
```

Replace `mytest.nytibd.com` with the final domain when you move. Also change the
"Verify certificate" link on nytibd.com to `https://mytest.nytibd.com/verify-certificate`.
When the old admin is no longer needed, redirect everything instead:
`RewriteRule ^(.*)$ https://mytest.nytibd.com/$1 [R=301,L]`.

## Entering results (mark sheets)

1. **Subjects**: Admin → Courses → choose a course → **Mark sheet subjects** → add each subject
   (semester — 0 for no semesters, code, name, full marks) → Save. Programmes that only issue
   results (diplomas) can be ticked **Hidden from the course catalogue**.
2. **Grading scale**: Admin → Website → **Grading scale** (minimum % for each grade, grade point,
   failing grade). Default: A+ 80 · A 75 · A- 70 (3.55) · B+ 65 · B 60 · B- 55 · C+ 50 · C 45 · D 40 · F.
3. **A batch**: Admin → **Results** → New results batch (course, batch name, duration, issuer).
   Add students (or **Paste students** from Excel: `Name, Roll, Reg, Father, Mother, Email`).
   In each cell type the **marks** (grade worked out) or a **grade** (e.g. `A+`). CGPA is the
   average grade point. Save as often as you like — it stays a draft.
4. **Publish & issue certificates**: each complete, passing student gets a certificate with the
   mark sheet. ID = `NYTI-{roll}-{reg}` when both numbers are given, otherwise `NYTI-YYYY-NNNNNN`.
   Students with missing results or a failing grade are skipped and listed; fix and publish again.
   Correcting a mark later updates the issued mark sheet (recorded in the certificate history).
5. **Partners** (Partner portal → Results) enter results for their courses the same way and
   **Submit to NYTI**. Admins see them under *Waiting for your approval* → **Publish** or
   **Send back** with a note.
6. **Students**: a certificate issued to an email appears in the student's account when they
   register (or immediately, if they already have one). Others can use **Certificates → Add an
   existing certificate** (reg + roll); requests appear in Admin → Results for approval.
