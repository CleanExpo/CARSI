/**
 * Generic seeder for structured, auto-marked course quizzes from any
 * `*.quizzes.json` file shaped like `data/seed/floor-care-quizzes.json` /
 * `data/seed/assessment-drafts/<slug>.quizzes.json` (WS2b, GP-445/GP-446):
 * `{ courseSlug, quizzes: [{ quizId, title, passPercentage, attemptsAllowed,
 * questions: [{ questionText, options[], correctIndex, points }] }] }`.
 *
 * Replaces the need for a bespoke per-course seed script (e.g.
 * `seed-floor-care-quizzes.ts`) going forward — this script is logically
 * identical to those, generalised to take the JSON path as an argument
 * instead of hardcoding it. Existing bespoke scripts are untouched and keep
 * working; use this one for any new course quiz batch instead of
 * copy-pasting another bespoke script.
 *
 * Extra fields in the JSON (e.g. `status`, `note`, `sourceGaps`,
 * `sourceRef`, `lessonTitle`) are ignored, same as the bespoke scripts —
 * only `courseSlug`, `quizzes[].quizId/title/passPercentage/attemptsAllowed`,
 * and `questions[].questionText/options/correctIndex/points` are read.
 *
 * Idempotent: upserts each quiz by its stable `quizId` and replaces its
 * questions, so re-running against an unchanged file is a no-op.
 *
 * Usage (run AFTER `db:seed-courses` has created the target course(s)):
 *   DATABASE_URL="postgresql://..." npm run db:seed-assessment-draft -- --file=data/seed/floor-care-quizzes.json
 *   DATABASE_URL="postgresql://..." npm run db:seed-assessment-draft -- --dir=data/seed/assessment-drafts
 *
 * `--file=<path>` seeds a single quizzes JSON file (relative to the repo root, or absolute).
 * `--dir=<path>` seeds every `*.quizzes.json` file directly inside that directory.
 * Exactly one of `--file` / `--dir` must be given.
 */
import 'dotenv/config';

import { readdirSync, readFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';

import { prisma } from '../src/lib/prisma';

type QuizQuestion = {
  questionText: string;
  options: string[];
  correctIndex: number;
  points?: number;
};

type QuizDef = {
  quizId: string;
  title: string;
  passPercentage: number;
  attemptsAllowed: number;
  questions: QuizQuestion[];
};

type QuizzesFile = {
  courseSlug: string;
  quizzes: QuizDef[];
};

function isQuizzesFile(value: unknown): value is QuizzesFile {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.courseSlug === 'string' && Array.isArray(v.quizzes);
}

function resolvePath(path: string): string {
  return isAbsolute(path) ? path : join(process.cwd(), path);
}

function resolveTargetFiles(): string[] {
  const fileFlag = process.argv.find((a) => a.startsWith('--file='));
  const dirFlag = process.argv.find((a) => a.startsWith('--dir='));

  if (fileFlag && dirFlag) {
    throw new Error('Pass only one of --file=<path> or --dir=<path>, not both.');
  }

  if (fileFlag) {
    return [resolvePath(fileFlag.slice('--file='.length))];
  }

  if (dirFlag) {
    const dirPath = resolvePath(dirFlag.slice('--dir='.length));
    const files = readdirSync(dirPath)
      .filter((name) => name.endsWith('.quizzes.json'))
      .sort()
      .map((name) => join(dirPath, name));
    if (files.length === 0) {
      throw new Error(`No *.quizzes.json files found in "${dirPath}".`);
    }
    return files;
  }

  throw new Error(
    'Missing required argument. Usage: npm run db:seed-assessment-draft -- --file=<path> | --dir=<path>',
  );
}

async function seedFile(path: string): Promise<number> {
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (!isQuizzesFile(parsed)) {
    throw new Error(`"${path}" is not in the expected quizzes-file shape.`);
  }

  const course = await prisma.lmsCourse.findUnique({
    where: { slug: parsed.courseSlug },
    select: { id: true },
  });
  if (!course) {
    throw new Error(
      `Course "${parsed.courseSlug}" not found (from "${path}"). Run "npm run db:seed-courses" first.`,
    );
  }

  let seeded = 0;
  for (const quiz of parsed.quizzes) {
    // Validate before writing.
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

    // Replace questions so re-runs stay in sync with the JSON.
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

  console.log(`Seeded ${seeded} quiz(zes) for course "${parsed.courseSlug}" from "${path}".`);
  return seeded;
}

async function main() {
  const files = resolveTargetFiles();
  let totalSeeded = 0;
  for (const file of files) {
    totalSeeded += await seedFile(file);
  }
  console.log(`Done. Seeded ${totalSeeded} quiz(zes) across ${files.length} file(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
