/**
 * GP-519 — pin the WordPress seed to fail-closed licence fields.
 *
 * `scripts/seed-wordpress-export-courses.ts` writes rows straight into `lms_courses`, which is
 * what the public site renders. It used to copy `iicrc_discipline` and `cec_hours` from the
 * WooCommerce export, bypassing both licence controls, because both live downstream of the
 * seed. That made two founder rulings silently reversible by running one npm script.
 *
 * This test is run against the REAL export, not a synthetic row, so it fails if the export
 * ever gains a shape the seed mishandles.
 *
 * Run: npx tsx scripts/seed-wordpress-export-courses.test.ts
 * Exit 0 = pinned. 1 = the bypass is back. 2 = could not test (never "fine").
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { wpRowToCourseData } from './seed-wordpress-export-courses';
import type { WpExportCourseRow } from '../src/lib/seed/wp-export-published-import-slugs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXPORT_PATH = join(__dirname, '..', 'data', 'wordpress-export', 'courses.json');

const failures: string[] = [];
let checked = 0;

function fail(msg: string) {
  failures.push(msg);
}

let rows: WpExportCourseRow[];
try {
  const parsed = JSON.parse(readFileSync(EXPORT_PATH, 'utf8')) as unknown;
  rows = (Array.isArray(parsed) ? parsed : []) as WpExportCourseRow[];
} catch (e) {
  console.error(`Could not read the export at ${EXPORT_PATH}: ${(e as Error).message}`);
  console.error('Refusing to report a pass — a test that read nothing proves nothing.');
  process.exit(2);
}

const published = rows.filter((r) => (r as { status?: string }).status === 'published');

// ---------------------------------------------------------------- non-vacuity preconditions
// If the export carried none of these fields, every assertion below would pass while guarding
// nothing at all — the exact shape of a control that has been tested only for its ability to
// agree with us.
if (published.length === 0) {
  console.error('FAIL(2) — no published rows in the export; this control would be vacuous.');
  process.exit(2);
}

const withDiscipline = published.filter(
  (r) => (r as { iicrc_discipline?: unknown }).iicrc_discipline != null
    && (r as { iicrc_discipline?: unknown }).iicrc_discipline !== ''
);
const withCec = published.filter(
  (r) => {
    const v = (r as { cec_hours?: unknown }).cec_hours;
    return v != null && v !== '' && v !== 0;
  }
);

if (withDiscipline.length === 0) {
  console.error(
    'FAIL(2) — no published export row carries `iicrc_discipline`, so the discipline assertion '
    + 'cannot fail and proves nothing. If the export was genuinely cleaned, delete that half '
    + 'of this test deliberately rather than leaving a control that cannot fire.'
  );
  process.exit(2);
}
if (withCec.length === 0) {
  console.error(
    'FAIL(2) — no published export row carries `cec_hours`; the CEC assertion would be vacuous.'
  );
  process.exit(2);
}

console.log(
  `precondition OK: ${published.length} published rows, `
  + `${withDiscipline.length} carrying iicrc_discipline, ${withCec.length} carrying cec_hours`
);

// ---------------------------------------------------------------- the assertions
const INSTRUCTOR = '00000000-0000-0000-0000-000000000000';

for (const row of published) {
  const data = wpRowToCourseData(row, INSTRUCTOR) as {
    iicrcDiscipline: unknown;
    cecHours: unknown;
    title: unknown;
  };
  checked += 1;

  if (data.iicrcDiscipline !== null) {
    fail(
      `${(row as { slug?: string }).slug}: iicrcDiscipline is ${JSON.stringify(data.iicrcDiscipline)}, `
      + 'must be null (founder ruling 2026-07-10). A seed that writes this column reverts '
      + 'migration 20260907010000.'
    );
  }
  if (data.cecHours !== 0) {
    fail(
      `${(row as { slug?: string }).slug}: cecHours is ${JSON.stringify(data.cecHours)}, must be 0. `
      + 'CEC hours come from the approvals registry only (founder directive 2026-07-09).'
    );
  }
}

// ---------------------------------------------------------------- positive control
// Everything above would also pass if wpRowToCourseData returned a constant stub, or if the
// import silently resolved to something inert. Prove the function actually processed the row
// by checking a field it IS supposed to pass through.
const sample = published.find((r) => (r as { title?: string }).title);
if (!sample) {
  console.error('FAIL(2) — no published row has a title; cannot run the positive control.');
  process.exit(2);
}
const sampleOut = wpRowToCourseData(sample, INSTRUCTOR) as { title: unknown };
if (sampleOut.title !== (sample as { title?: string }).title) {
  fail(
    'positive control: wpRowToCourseData did not pass `title` through unchanged '
    + `(got ${JSON.stringify(sampleOut.title)}), so the null/0 results above may not mean the `
    + 'fields are pinned — they may mean nothing ran.'
  );
}

if (failures.length > 0) {
  console.error(`FAIL — ${failures.length} of ${checked} rows break the licence pinning:\n`);
  for (const f of failures.slice(0, 15)) console.error(`  - ${f}`);
  if (failures.length > 15) console.error(`  ... and ${failures.length - 15} more`);
  process.exit(1);
}

console.log(
  `OK — ${checked} published rows all seed with iicrcDiscipline=null and cecHours=0, `
  + 'and the positive control confirms the row was actually processed.'
);
