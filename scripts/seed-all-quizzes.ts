/**
 * Seed ALL course knowledge-check quizzes as part of the deploy boot path (GP-484).
 *
 * Runs after `db:seed-courses` inside `start:with-course-seed`, so every deploy converges
 * prod quizzes with the repo's seed data. Each quiz file follows the shared schema
 * (`courseSlug`, `quizzes[]` with `quizId/title/passPercentage/attemptsAllowed/questions[]`)
 * used by seed-h5-bird-flu-quiz.ts / seed-floor-care-quizzes.ts /
 * seed-commercial-floor-care-quiz.ts, which remain for targeted one-off runs.
 *
 * FAULT-TOLERANT BY DESIGN: this script always exits 0. A bad quiz file or a missing course
 * must never stop `next start` from running — a boot-blocking seeder would take prod down.
 * Failures are logged loudly and the affected quiz is skipped.
 *
 * Idempotent: upserts each quiz by its stable id and replaces its questions.
 */
import 'dotenv/config';

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { prisma } from '../src/lib/prisma';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_DIR = join(__dirname, '..', 'data', 'seed');

const QUIZ_FILES = [
  'h5-bird-flu-quiz.json',
  'floor-care-quizzes.json',
  'commercial-floor-care-quiz.json',
  'ccw-truckmount.quizzes.json',
  'water-damage-restoration-fundamentals-quiz.json',
  'applied-microbial-remediation-mould-fundamentals-quiz.json',
  'applied-structural-drying-fundamentals-quiz.json',
];

type QuizQuestion = {
  questionText: string;
  options: string[];
  correctIndex: number;
  points?: number;
};

type QuizDef = {
  quizId: string;
  lessonTitle?: string;
  title: string;
  passPercentage: number;
  attemptsAllowed: number;
  questions: QuizQuestion[];
};

type QuizzesFile = {
  version: number;
  courseSlug: string;
  quizzes: QuizDef[];
};

function isQuizzesFile(value: unknown): value is QuizzesFile {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.courseSlug === 'string' && Array.isArray(v.quizzes);
}

async function seedQuizFile(fileName: string): Promise<number> {
  const parsed: unknown = JSON.parse(readFileSync(join(SEED_DIR, fileName), 'utf8'));
  if (!isQuizzesFile(parsed)) {
    throw new Error(`${fileName} is not in the expected quizzes-file shape`);
  }

  const course = await prisma.lmsCourse.findUnique({
    where: { slug: parsed.courseSlug },
    select: { id: true },
  });
  if (!course) {
    throw new Error(`Course "${parsed.courseSlug}" not found — run db:seed-courses first.`);
  }

  let seeded = 0;
  for (const quiz of parsed.quizzes) {
    quiz.questions.forEach((q) => {
      if (!Array.isArray(q.options) || q.options.length < 2) {
        throw new Error(`Quiz "${quiz.title}" has a question with fewer than 2 options.`);
      }
      if (q.correctIndex < 0 || q.correctIndex >= q.options.length) {
        throw new Error(`Quiz "${quiz.title}" has a correctIndex out of range.`);
      }
    });

    await prisma.lmsQuiz.upsert({
      where: { id: quiz.quizId },
      create: {
        id: quiz.quizId,
        courseId: course.id,
        title: quiz.title,
        passPercentage: quiz.passPercentage,
        attemptsAllowed: quiz.attemptsAllowed,
      },
      update: {
        courseId: course.id,
        title: quiz.title,
        passPercentage: quiz.passPercentage,
        attemptsAllowed: quiz.attemptsAllowed,
      },
    });

    await prisma.lmsQuizQuestion.deleteMany({ where: { quizId: quiz.quizId } });
    for (let i = 0; i < quiz.questions.length; i += 1) {
      const q = quiz.questions[i];
      await prisma.lmsQuizQuestion.create({
        data: {
          quizId: quiz.quizId,
          questionText: q.questionText,
          options: q.options.map((text) => ({ text })),
          correctIndex: q.correctIndex,
          orderIndex: i,
          points: q.points ?? 1,
        },
      });
    }
    seeded += 1;
  }

  return seeded;
}

async function main() {
  let ok = 0;
  let failed = 0;
  for (const fileName of QUIZ_FILES) {
    try {
      const seeded = await seedQuizFile(fileName);
      ok += seeded;
      console.log(`✓ ${fileName}: seeded ${seeded} quiz(zes).`);
    } catch (e) {
      failed += 1;
      console.error(`✗ ${fileName}: SKIPPED —`, e instanceof Error ? e.message : e);
    }
  }
  console.log(`Quiz seed complete: ${ok} quiz(zes) seeded, ${failed} file(s) skipped.`);
}

main()
  .catch((e) => {
    // Never block boot — log and continue to next start.
    console.error('seed-all-quizzes failed unexpectedly (boot continues):', e);
  })
  .finally(() => prisma.$disconnect());
