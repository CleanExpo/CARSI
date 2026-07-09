/**
 * IICRC CEC submission-pack generator (C2 of the IICRC-compliance spec).
 *
 * Emits the per-course submission pack the IICRC's CEC course-approval process asks for
 * (submission address: CECCourse@iicrcnet.org — iicrc.org FAQ / restorationindustry.org):
 * provider name & website, course title, dates & duration, summary & learning objectives,
 * instructor, point of contact, and a supporting-documentation list. Everything comes from
 * `data/seed/courses-catalog.json`; nothing here creates a CEC claim — approval is recorded
 * afterwards by the founder in `data/seed/cec-approvals.json` (the SSOT, `npm run check:cec`).
 *
 *   npx tsx scripts/generate-cec-submission.ts <course-slug>
 *   npx tsx scripts/generate-cec-submission.ts <course-slug> --out /path/to/pack.md
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { CatalogCourse, CoursesCatalogFile } from '../src/lib/seed/courses-catalog-types';
import { getCecApproval } from '../src/lib/seed/cec-approvals';
import { resolveDurationHours } from '../src/lib/seed/cec-hours';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CATALOG_PATH = join(ROOT, 'data', 'seed', 'courses-catalog.json');

const PROVIDER_NAME = 'Cleaning and Restoration Science Institute (CARSI)';
const PROVIDER_WEBSITE = 'https://www.carsi.com.au';
const POINT_OF_CONTACT = 'CARSI Support — support@carsi.com.au';

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstParagraph(s: string | null | undefined, maxLen = 900): string | null {
  if (!s?.trim()) return null;
  const text = stripHtml(s);
  const para = text.split(/\n\s*\n/)[0] ?? text;
  return para.length > maxLen ? `${para.slice(0, maxLen).trimEnd()}…` : para;
}

function formatAuDate(d: Date): string {
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function buildPack(course: CatalogCourse, instructorName: string | null): string {
  const durationHours = resolveDurationHours({
    durationHours: course.durationHours,
    shortDescription: course.shortDescription,
    description: course.description,
  });
  const requestedCecs = durationHours != null ? Math.max(1, Math.floor(durationHours)) : null;

  const summary =
    firstParagraph(course.shortDescription) ??
    firstParagraph(course.description) ??
    'TBC — founder to supply a course summary.';

  const objectives: string[] = [];
  for (const mod of course.modules ?? []) {
    const lessonTitles = (mod.lessons ?? [])
      .slice()
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((l) => l.title)
      .filter(Boolean);
    objectives.push(
      `Module — ${mod.title}${lessonTitles.length > 0 ? `: ${lessonTitles.join('; ')}` : ''}`
    );
  }

  const registryEntry = getCecApproval(course.slug);
  const today = formatAuDate(new Date());

  return `# IICRC CEC Course Approval Submission — ${course.title}

Prepared ${today} for submission to **CECCourse@iicrcnet.org**.

## 1. Provider name and website

- **Provider:** ${PROVIDER_NAME}
- **Website:** ${PROVIDER_WEBSITE}
- **Standing:** listed in the IICRC CEC Provider Directory and Online CEC Training list (iicrccecevents.com)

## 2. Course title

- **Title:** ${course.title}
- **Catalogue slug:** \`${course.slug}\`
- **Level:** ${course.level ?? 'All levels'}
- **Category:** ${course.category ?? 'Restoration / cleaning continuing education'}

## 3. Dates and duration

- **Delivery:** online, self-paced (on demand) at ${PROVIDER_WEBSITE}
- **Available from:** ${today} (submitted for approval before any CEC claim is made)
- **Duration:** ${
    durationHours != null
      ? `${durationHours} educational hour${durationHours === 1 ? '' : 's'}`
      : 'TBC — founder to confirm the educational (contact) hours'
  }
- **CECs requested:** ${
    requestedCecs != null
      ? `${requestedCecs} (1 CEC per educational hour, per the published IICRC CEC arithmetic)`
      : 'TBC — 1 CEC per educational hour once duration is confirmed'
  }

## 4. Course summary and learning objectives

**Summary.** ${summary}

**Learning objectives / curriculum outline.**

${objectives.length > 0 ? objectives.map((o) => `- ${o}`).join('\n') : '- TBC — founder to supply learning objectives.'}

## 5. Instructor

- ${instructorName && instructorName !== 'CARSI Catalog' ? instructorName : 'TBC — founder to nominate the delivering instructor (catalogue lists the system instructor)'}

## 6. Point of contact

- ${POINT_OF_CONTACT}

## 7. Supporting documentation

- Full course curriculum export (modules and lessons) from the CARSI LMS
- Learning-objective map (section 4 above)
- Sample certificate of completion (issued on course completion; names learner, course, hours)
- Assessment/quiz outline demonstrating learner evaluation
- CARSI listing in the IICRC CEC Provider Directory (iicrccecevents.com)

---

Registry status for this course: ${
    registryEntry
      ? `**${registryEntry.status}**${registryEntry.status === 'approved' ? ` — ${registryEntry.approvedHours} CEC hour(s), ref ${registryEntry.iicrcReference}` : ''}`
      : '**not_submitted** (no entry in data/seed/cec-approvals.json yet)'
  }.
On IICRC approval, the founder records {slug, status: "approved", approvedHours, approvedAt,
iicrcReference, evidence} in \`data/seed/cec-approvals.json\` — only then may the course
display CEC hours (validated by \`npm run check:cec\`).
`;
}

function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--');
  const outFlag = args.indexOf('--out');
  let outPath: string | null = null;
  if (outFlag !== -1) {
    outPath = args[outFlag + 1] ?? null;
    args.splice(outFlag, 2);
  }
  const slug = args[0]?.trim();
  if (!slug) {
    console.error('Usage: npx tsx scripts/generate-cec-submission.ts <course-slug> [--out <file>]');
    process.exit(1);
  }

  const catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf8')) as CoursesCatalogFile;
  const course = catalog.courses.find((c) => c.slug === slug);
  if (!course) {
    console.error(`Course slug "${slug}" not found in data/seed/courses-catalog.json.`);
    console.error(`Known slugs:\n${catalog.courses.map((c) => `  ${c.slug}`).join('\n')}`);
    process.exit(1);
  }

  const instructor = catalog.instructors.find((i) => i.id === course.instructorId);
  const pack = buildPack(course, instructor?.fullName ?? null);

  if (outPath) {
    writeFileSync(outPath, pack, 'utf8');
    console.log(`Submission pack written to ${outPath}`);
  } else {
    console.log(pack);
  }
}

main();
