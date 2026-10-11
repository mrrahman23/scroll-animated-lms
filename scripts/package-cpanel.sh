#!/usr/bin/env bash
# Builds a cPanel-ready package: deploy/nyti-cpanel.zip
# Unzip it into the Node.js app's "Application root" and set the startup file to server.js.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "→ Checking content files"
node scripts/check-data.mjs

# MariaDB (common on cPanel) rejects drizzle's "serial AUTO_INCREMENT" — migrations must use
# "bigint unsigned AUTO_INCREMENT" (fix new migrations with the same sed as in the docs)
if grep -l "serial AUTO_INCREMENT" drizzle/*.sql >/dev/null 2>&1; then
  echo "✗ drizzle/*.sql uses 'serial AUTO_INCREMENT' — run:"
  echo "  sed -i '' 's/serial AUTO_INCREMENT NOT NULL/bigint unsigned AUTO_INCREMENT NOT NULL/g' drizzle/*.sql"
  exit 1
fi

echo "→ Building (standalone, cPanel mode)"
rm -rf .next/standalone  # leave .next/dev alone (a dev server may be running)
# Build without the local database settings from .env.local (the server has its own)
DATABASE_URL= CPANEL_BUILD=1 npx next build

OUT=deploy/nyti-cpanel
rm -rf "$OUT" deploy/nyti-cpanel.zip
mkdir -p "$OUT"
cp -R .next/standalone/. "$OUT/"
mkdir -p "$OUT/.next"
cp -R .next/static "$OUT/.next/static"
cp -R public "$OUT/public"
# Content ships as data-initial/: on start the server copies any file that's missing from data/
# (the first deploy copies everything), and never overwrites data/ — so edits made in the
# admin survive every redeploy.
rm -rf "$OUT/data" "$OUT/data-initial"
cp -R data "$OUT/data-initial"
rm -rf "$OUT/data-initial/.history" "$OUT/data-initial/legacy-import" "$OUT/data-initial/uploads/legacy"
# Database migrations (applied automatically when the server starts)
rm -rf "$OUT/drizzle" && cp -R drizzle "$OUT/drizzle"
# Never ship local env files, source, or old-system exports (personal data)
rm -f "$OUT"/.env*
rm -rf "$OUT/legacy" "$OUT/src"
LEAK=$(find "$OUT" \( -name "*.sql" -not -path "$OUT/drizzle/*" \) -o -name ".env*" -o -path "$OUT/data-initial/legacy-import*" -o -path "$OUT/data-initial/uploads/legacy*" | head -5)
if [ -n "$LEAK" ]; then
  echo "✗ Refusing to package: private files found in the build:"; echo "$LEAK"; exit 1
fi

# Images are unoptimized in cPanel mode, so the (OS-specific) image library isn't needed
rm -rf "$OUT/node_modules/sharp" "$OUT/node_modules/@img"

# Native binaries compiled for this machine would not run on Linux hosting — flag any
NATIVE=$(find "$OUT/node_modules" -name "*.node" 2>/dev/null || true)
if [ -n "$NATIVE" ]; then
  echo "⚠ Native modules found (may not run on Linux):"; echo "$NATIVE"
fi

(cd deploy && zip -qr nyti-cpanel.zip nyti-cpanel)
echo "✓ deploy/nyti-cpanel.zip ($(du -h deploy/nyti-cpanel.zip | cut -f1))"
