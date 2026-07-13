/**
 * Seed the structured, auto-marked knowledge-check quiz for the "Commercial Floor Care for
 * Schools & Childcare Contracts" course from `data/seed/commercial-floor-care-quiz.json`.
 *
 * The course's "Knowledge check" lesson is seeded (by `db:seed-courses`) with `contentType: 'quiz'`
 * and `contentBody` = the quiz UUID. This script creates the matching `LmsQuiz` +
 * `LmsQuizQuestion` rows so the lesson player renders them via `QuizPlayer`. Mirrors
 * `seed-h5-bird-flu-quiz.ts`.
 *
 * Idempotent: upserts the quiz by its stable id and replaces its questions.
 *
 * Do not run until founder/SME content sign-off is recorded — the course itself is seeded with
 * `isPublished: false`, so seeding this quiz does not make the course visible.
 *
 * Run AFTER the catalog seed:
 *   DATABASE_URL="postgresql://..." npm run db:seed-courses
 *   DATABASE_URL="postgresql://..." npm run db:seed-commercial-floor-care-quiz
 */
import 'dotenv/config';

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { prisma } from '../src/lib/prisma';

const __dirname = dirname(fileURLToPath(import.meta.url));
const QUIZZES_PATH = join(__dirname, '..', 'data', 'seed', 'commercial-floor-care-quiz.json');

type QuizQuestion = {
  questionText: string;
  options: string[];
  correctIndex: number;
  points?: number;
};

type QuizDef = {
  quizId: string;
  lessonTitle: string;
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

async function main() {
  const parsed: unknown = JSON.parse(readFileSync(QUIZZES_PATH, 'utf8'));
  if (!isQuizzesFile(parsed)) {
    throw new Error('commercial-floor-care-quiz.json is not in the expected shape');
  }

  const course = await prisma.lmsCourse.findUnique({
    where: { slug: parsed.courseSlug },
    select: { id: true },
  });
  if (!course) {
    throw new Error(
      `Course "${parsed.courseSlug}" not found. Run "npm run db:seed-courses" first.`,
    );
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

  console.log(`Seeded ${seeded} commercial floor care quiz(zes) for course "${parsed.courseSlug}".`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
