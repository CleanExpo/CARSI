#!/usr/bin/env node
/**
 * Non-vacuity proof for the course-visibility predicate guard.
 *
 * A guard that cannot fail is worthless — and this one nearly shipped that way. During
 * construction it carried four defects, each found only by reverting a real bug and watching the
 * guard stay green:
 *   1. no word boundary, so `isPublishedRow` (a tolerant union helper) was reported as a violation
 *   2. `if (/status/.test(ctx))` treated ANY nearby `status` as the safe union — the teams route
 *      has `status: { notIn: ['cancelled'] }` two lines above the course filter, which disarmed
 *      the guard on the exact bug it exists to catch
 *   3. Prisma-model resolution rejected in-memory reads, because in pathway-progress the nearest
 *      `prisma.` model is lmsLessonProgress
 *   4. the filter test used a backwards window with `[^)]*$`, which cannot span the preceding
 *      line's closed `.filter(...)`
 *
 * Every MUST_BLOCK case below is one of those shapes. If someone makes the guard inert, this
 * goes red.
 */
import { evaluateFile } from './check-course-visibility-predicate.mjs';

const MUST_BLOCK = [
  [
    'where clause on a nested course relation (defect 2 — enrolment status must not disarm)',
    "const rows = await prisma.lmsEnrollment.findMany({\n  where: {\n    studentId: id,\n    status: { notIn: ['cancelled'] },\n    course: { isPublished: true },\n  },\n});",
  ],
  [
    'in-memory filter after an unrelated prisma model (defect 3)',
    'const r = await prisma.lmsLessonProgress.findMany({ where: { studentId } });\nconst out = pathway.courses\n  .filter((pc) => pc.course.isPublished)\n  .map((pc) => pc.course);',
  ],
  [
    'in-memory filter preceded by a closed filter on the line above (defect 4)',
    'return pathways\n  .filter((p) => p.courses.length > 0)\n  .map((p) => p.courses.filter((pc) => pc.course.isPublished));',
  ],
  [
    'bare where clause directly on lmsCourse',
    'const rows = await prisma.lmsCourse.findMany({\n  where: { isPublished: true },\n});',
  ],
  [
    'course relation filter with a NON-publication status nearby',
    "const rows = await prisma.lmsEnrollment.findMany({\n  where: {\n    status: { in: ['active'] },\n    course: { isPublished: true },\n  },\n});",
  ],
  // Defect 5, found by the independent reviewer on d8c463d9. The context gate admitted only
  // `where` and `.filter`, so an in-memory decision written as plain control flow never reached
  // the model check. This is the LEAST exotic shape in the file and it was the one that escaped.
  [
    'bare member read in a conditional (defect 5)',
    'const course = await getCourse(slug);\nif (course.isPublished) {\n  return renderCourse(course);\n}\nreturn notFound();',
  ],
  [
    'member read assigned to a variable (defect 5)',
    'const course = rows[0];\nconst visible = course.isPublished;\nreturn visible ? course : null;',
  ],
  [
    'destructured off a course object (defect 5)',
    'const course = await getCourse(slug);\nconst { title, isPublished } = course;\nif (!isPublished) return notFound();',
  ],
  [
    'member read returned directly (defect 5)',
    'export function canSee(course: LmsCourse) {\n  return course.isPublished;\n}',
  ],
  // Reviewer round 3. Optional chaining is the same decision wearing a safer operator.
  [
    'optional-chained member read (defect 6)',
    'const course = await getCourse(slug);\nif (course?.isPublished) {\n  return renderCourse(course);\n}',
  ],
];

const MUST_PASS = [
  [
    'tolerant union — canonical clause still admits the course',
    "const publishedWhere = {\n  OR: [\n    { isPublished: true },\n    { status: { equals: 'published', mode: 'insensitive' } },\n  ],\n};",
  ],
  [
    'derived FROM status — legacy column is an output, not an input',
    "const statusRaw = (course.status ?? 'draft').toLowerCase();\nconst isPublished = statusRaw === 'published';\nawait prisma.lmsCourse.update({ data: { status: statusRaw, isPublished } });",
  ],
  [
    "a different entity's own flag — pathways own theirs",
    'const rows = await prisma.lmsLearningPathway.findMany({\n  where: { isPublished: true },\n});',
  ],
  [
    "a review's own flag, scoped by courseId",
    'const rows = await prisma.lmsCourseReview.findMany({\n  where: { courseId, isPublished: true },\n});',
  ],
  [
    'substring — isPublishedRow is a helper, not the field (defect 1)',
    'const published = candidates.filter(isPublishedRow);',
  ],
  [
    'type member declaration',
    'interface Row {\n  isPublished: boolean | null;\n}',
  ],
  [
    'import of the canonical helper',
    "import { isPublishedCourseStatus } from '@/lib/server/public-courses-list';",
  ],
  [
    'select projection — not a visibility decision',
    'const q = await prisma.lmsCourse.findMany({\n  select: { slug: true, isPublished: true },\n});',
  ],
  [
    'comment mentioning the column',
    '// `isPublished` is the legacy dual-write column; prefer status',
  ],
  [
    'React state setter on an unrelated entity',
    'onChange={(e) => setEditing((f) => (f ? { ...f, isPublished: e.target.checked } : f))}',
  ],
  // These four are the guard's KNOWN LIMIT held in place. Reviewer round 3 asked for the member
  // read to match ANY identifier, not just `course`. These are the real reads that widening would
  // turn red — each a DIFFERENT entity with its own isPublished column, or a tolerant union.
  // Verbatim from the tree at 4eb7733d. If a future "hardening" flags them, this goes red first.
  [
    "practical assessment's own flag (src/lib/server/practical-assessment.ts:161)",
    'if (!assessment || !assessment.isPublished) {\n  return null;\n}',
  ],
  [
    "course review's own flag (src/lib/server/course-reviews.ts:144)",
    'const summary = summarizeReviews(rows.filter((r) => r.isPublished));',
  ],
  [
    'tolerant union helper (src/lib/server/renewal-summary.ts:38)',
    "function isPublishedRow(c: { status: string; isPublished: boolean | null }): boolean {\n  if (c.isPublished === true) return true;\n  return String(c.status ?? '').toLowerCase().trim() === 'published';\n}",
  ],
  [
    'admin author client editing a practical assessment',
    "{a.isPublished ? 'Published' : 'Draft'}",
  ],
];

let failed = 0;

for (const [name, src] of MUST_BLOCK) {
  if (evaluateFile('app/api/fixture/route.ts', src).length === 0) {
    console.error(`✖ MUST BLOCK but passed: ${name}\n    ${src.replace(/\n/g, ' ')}`);
    failed++;
  }
}

for (const [name, src] of MUST_PASS) {
  const f = evaluateFile('src/lib/server/fixture.ts', src);
  if (f.length > 0) {
    console.error(
      `✖ MUST PASS but blocked: ${name}\n    ${src.replace(/\n/g, ' ')}\n    ${f.map((x) => x.text).join('\n    ')}`
    );
    failed++;
  }
}

// The admin allowlist must actually exempt, or the guard would flag a deliberate dual read.
const adminSrc = "const published = course.isPublished === true || status === 'published';";
if (evaluateFile('src/lib/admin/admin-courses-service.ts', adminSrc).length > 0) {
  console.error('✖ admin-courses-service should be allowlisted but was flagged');
  failed++;
}

if (failed > 0) {
  console.error(`\n✖ Course-visibility guard self-test failed — ${failed} case(s).`);
  process.exit(1);
}
console.log(
  `✓ Course-visibility guard self-test passed (${MUST_BLOCK.length} block, ${MUST_PASS.length} pass, 1 allowlist).`
);
process.exit(0);
