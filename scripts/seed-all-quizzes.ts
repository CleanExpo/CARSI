/**
 * Seed course knowledge-check quizzes from the repo's seed data (GP-484), one course or all.
 *
 * USAGE (run AFTER `db:seed-courses` has created the target course):
 *   npm run db:seed-quizzes -- --slug=<course-slug> --dry-run   # preview, no DB connection
 *   npm run db:seed-quizzes -- --slug=<course-slug>             # seed ONLY that course
 *   npm run db:seed-quizzes -- --slug=<course-slug> --allow-draft
 *        # a course whose quiz exists only as data/seed/assessment-drafts/<slug>.quizzes.json
 *        # (e.g. level-2-mould-remediation) — only after SME/founder sign-off
 *   npm run db:seed-quizzes -- --all                            # every file on QUIZ_FILES
 * With no --slug and no --all the script refuses and writes nothing (exit 1).
 *
 * --slug resolves the course's file the same way --all does (the catalogue file on QUIZ_FILES whose
 * `courseSlug` matches); the draft file is used only when no catalogue file exists, because drafts
 * for catalogue courses carry different quizIds and would add a second quiz to the course.
 * An unknown slug, a missing/invalid file or a missing course exits non-zero; every file is
 * validated before the first write.
 *
 * WRITES: upserts each quiz by its stable quizId; questions go through `writeQuizQuestions` —
 * unchanged questions keep their ids, a changed question set DELETES and re-creates that quiz's
 * questions (learners' saved quiz content versions go stale). Quiz attempts are never deleted.
 * Logic and tests: src/lib/lms/quiz-seed.ts.
 *
 * MANUAL ONLY — this does NOT run at deploy. The production boot path is `start:production`
 * (do-migrate.sh → node server.js), which applies Prisma migrations and never seeds course
 * content; the live DB is the source of truth for quizzes/courses (GP-503). `--all` also runs
 * inside the manual `start:with-course-seed` convenience script and keeps its original
 * fault-tolerant contract: a bad file or missing course is logged and skipped, exit 0.
 */
import 'dotenv/config';

import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { runQuizSeed, type QuizSeedDb } from '../src/lib/lms/quiz-seed';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_DIR = join(__dirname, '..', 'data', 'seed');

async function main(): Promise<number> {
  let disconnect: (() => Promise<void>) | undefined;
  try {
    return await runQuizSeed(process.argv.slice(2), {
      seedDir: SEED_DIR,
      getDb: async () => {
        // Imported lazily so --dry-run and refused runs never open a connection.
        const { prisma } = await import('../src/lib/prisma');
        disconnect = () => prisma.$disconnect();
        return prisma satisfies QuizSeedDb;
      },
      log: (m) => console.log(m),
      error: (m) => console.error(m),
    });
  } finally {
    await disconnect?.();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((e) => {
      console.error('seed-all-quizzes failed unexpectedly:', e);
      process.exitCode = 1;
    });
}
