#!/usr/bin/env node
/**
 * GP-449 #298 — verify the live professional directory does not serve fabricated NRPG data.
 *
 * Usage:
 *   node scripts/verify-professional-directory.mjs
 *   PROFESSIONAL_DIRECTORY_URL=https://carsi.com.au/professional-directory node scripts/verify-professional-directory.mjs
 */
const url =
  process.env.PROFESSIONAL_DIRECTORY_URL?.trim() ||
  'https://carsi.com.au/professional-directory';

const FABRICATED_NRPG_ID = /NRPG-[A-Z]{2}-\d{5}/;
const STUB_NAME_MARKERS = [
  'Mitchell Water Restoration',
  "O'Connor Fire & Smoke Specialists",
  'Sharma Indoor Environment Consulting',
];

async function main() {
  const res = await fetch(url, { headers: { Accept: 'text/html' } });
  if (!res.ok) {
    console.error(`FAIL: ${url} returned HTTP ${res.status}`);
    process.exit(1);
  }

  const html = await res.text();

  if (FABRICATED_NRPG_ID.test(html)) {
    console.error(`FAIL: fabricated NRPG member id pattern found on ${url}`);
    process.exit(1);
  }

  for (const marker of STUB_NAME_MARKERS) {
    if (html.includes(marker)) {
      console.error(`FAIL: legacy stub listing "${marker}" still visible on ${url}`);
      process.exit(1);
    }
  }

  if (!/coming soon|not live yet|no professionals are listed/i.test(html)) {
    console.error(
      `FAIL: expected honest coming-soon copy on ${url} (no "coming soon" / "not live yet" found)`
    );
    process.exit(1);
  }

  console.log(`OK: ${url} — no fabricated NRPG directory data detected.`);
}

main().catch((error) => {
  console.error('FAIL:', error instanceof Error ? error.message : error);
  process.exit(1);
});
