/**
 * Seed the practical competency assessment + rubric (the trainer sign-off, the
 * "saved for legality" record) for the CCW-CARSI Truckmount Operations course
 * from `data/seed/ccw-truckmount-assessment.json`.
 *
 * Creates the `LmsPracticalAssessment` and its `LmsRubricCriterion` rows so the
 * course's practical-assessment surface renders the two-gate sign-off (Gate A
 * trainer pre-flight, Gate B operator competency, carbon-monoxide zero-tolerance).
 * Student submissions (`LmsAssessmentSubmission`) — which carry the machine
 * make/model/serial the operator was signed off on — are created at runtime, not
 * seeded here.
 *
 * Idempotent: upserts the assessment by its stable id and replaces its criteria,
 * so re-running against an unchanged file is a no-op. Kept unpublished
 * (`isPublished: false`) — the course itself is a founder-gated draft.
 *
 * Run AFTER the catalog seed (which creates the course):
 *   DATABASE_URL="postgresql://..." npm run db:seed-courses
 *   DATABASE_URL="postgresql://..." npm run db:seed-ccw-truckmount-assessment
 */
import 'dotenv/config';

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { prisma } from '../src/lib/prisma';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, '..', 'data', 'seed', 'ccw-truckmount-assessment.json');

type Criterion = {
  label: string;
  description: string;
  maxPoints: number;
};

type AssessmentFile = {
  version: number;
  courseSlug: string;
  assessment: {
    id: string;
    title: string;
    instructions: string;
    passThreshold: number;
    isPublished: boolean;
    criteria: Criterion[];
  };
};

function isAssessmentFile(value: unknown): value is AssessmentFile {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.courseSlug !== 'string') return false;
  const a = v.assessment as Record<string, unknown> | undefined;
  return (
    typeof a === 'object' &&
    a !== null &&
    typeof a.id === 'string' &&
    typeof a.title === 'string' &&
    typeof a.instructions === 'string' &&
    Array.isArray(a.criteria)
  );
}

async function main() {
  const parsed: unknown = JSON.parse(readFileSync(DATA_PATH, 'utf8'));
  if (!isAssessmentFile(parsed)) {
    throw new Error('ccw-truckmount-assessment.json is not in the expected shape');
  }

  const { courseSlug, assessment } = parsed;

  assessment.criteria.forEach((c) => {
    if (!c.label?.trim()) throw new Error('A rubric criterion is missing a label.');
    if (!Number.isInteger(c.maxPoints) || c.maxPoints <= 0) {
      throw new Error(`Criterion "${c.label}" has an invalid maxPoints.`);
    }
  });

  const course = await prisma.lmsCourse.findUnique({
    where: { slug: courseSlug },
    select: { id: true },
  });
  if (!course) {
    throw new Error(`Course "${courseSlug}" not found. Run "npm run db:seed-courses" first.`);
  }

  await prisma.lmsPracticalAssessment.upsert({
    where: { id: assessment.id },
    create: {
      id: assessment.id,
      courseId: course.id,
      title: assessment.title,
      instructions: assessment.instructions,
      passThreshold: assessment.passThreshold,
      isPublished: assessment.isPublished,
    },
    update: {
      courseId: course.id,
      title: assessment.title,
      instructions: assessment.instructions,
      passThreshold: assessment.passThreshold,
      isPublished: assessment.isPublished,
    },
  });

  await prisma.lmsRubricCriterion.deleteMany({ where: { assessmentId: assessment.id } });
  for (let i = 0; i < assessment.criteria.length; i += 1) {
    const c = assessment.criteria[i];
    await prisma.lmsRubricCriterion.create({
      data: {
        assessmentId: assessment.id,
        label: c.label,
        description: c.description,
        maxPoints: c.maxPoints,
        orderIndex: i,
      },
    });
  }

  console.log(
    `Seeded practical assessment "${assessment.title}" with ${assessment.criteria.length} rubric criteria for "${courseSlug}".`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
