/**
 * Quiz seeding core for `scripts/seed-all-quizzes.ts` (`npm run db:seed-quizzes`).
 *
 * Two modes, chosen explicitly on the command line:
 *   --slug=<course-slug>  seed ONLY that course's quiz file(s). Any failure exits non-zero and,
 *                         because everything is validated before the first write, writes nothing.
 *   --all                 the previous behaviour: every file on QUIZ_FILES, fault-tolerant (a bad
 *                         file is logged and skipped, exit code 0).
 * With neither flag the run refuses (exit 1) and writes nothing.
 *
 * Write semantics (unchanged from the original seeder):
 *   - `lms_quizzes`: upsert by the file's stable `quizId` (title, pass mark, attempts, courseId).
 *   - `lms_quiz_questions`: via `writeQuizQuestions` — unchanged questions keep their ids and only
 *     explanations are updated; any changed question set DELETES and re-creates that quiz's
 *     questions (new ids, so learners' saved quiz content versions go stale).
 *   - `lms_quiz_attempts` are never deleted or written by this module.
 *   - Quizzes in the DB that are not in the file are left alone (no pruning).
 *
 * Added guard: a quizId that already exists under a DIFFERENT course is refused rather than
 * silently re-parented by the upsert.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { writeQuizQuestions, type QuizQuestionWriter } from './quiz-explanation-carry';

/** Catalogue quiz files (in `data/seed/`) seeded by `--all`, and searched first for `--slug`. */
export const QUIZ_FILES = [
  'h5-bird-flu-quiz.json',
  'floor-care-quizzes.json',
  'commercial-floor-care-quiz.json',
  'ccw-truckmount.quizzes.json',
  'water-damage-restoration-fundamentals-quiz.json',
  'mould-remediation-fundamentals-quiz.json',
  'structural-drying-fundamentals-quiz.json',
  'category-3-sewage-black-water-remediation-quiz.json',
  'asbestos-awareness-for-restoration-technicians-quiz.json',
  'psychrometry-building-science-for-drying-quiz.json',
  'moisture-meters-readings-and-dry-standards-quiz.json',
  'fire-smoke-damage-restoration-fundamentals-quiz.json',
  'trauma-crime-scene-decontamination-fundamentals-quiz.json',
  'carpet-cleaning-fundamentals-quiz.json',
  'timber-floor-assessment-restoration-quiz.json',
  'assessing-indoor-environment-conditions-quiz.json',
  'ozone-and-hydroxyl-generators-what-the-evidence-says-quiz.json',
  'asthma-and-allergy-course-quiz.json',
  'agi-essentials-small-business-quiz.json',
  'social-media-marketing-quiz.json',
  'admin-sole-trader-quiz.json',
] as const;

/** Draft quiz files live at `data/seed/assessment-drafts/<slug>.quizzes.json`. */
export const DRAFTS_DIR = 'assessment-drafts';

export type QuizQuestion = {
  questionText: string;
  options: string[];
  correctIndex: number;
  points?: number;
  // Practitioner-authored "why" for a wrong answer (never generated from IICRC standard text).
  explanation?: string | null;
};

export type QuizDef = {
  quizId: string;
  lessonTitle?: string;
  title: string;
  passPercentage: number;
  attemptsAllowed: number;
  questions: QuizQuestion[];
};

export type QuizzesFile = {
  version?: number;
  status?: string;
  courseSlug: string;
  quizzes: QuizDef[];
};

export type ResolvedQuizFile = {
  path: string;
  source: 'catalogue' | 'draft';
  file: QuizzesFile;
};

export type QuizSeedDb = QuizQuestionWriter & {
  lmsCourse: {
    findUnique(args: {
      where: { slug: string };
      select: { id: true };
    }): Promise<{ id: string } | null>;
  };
  lmsQuiz: {
    findUnique(args: {
      where: { id: string };
      select: { courseId: true };
    }): Promise<{ courseId: string } | null>;
    upsert(args: {
      where: { id: string };
      create: {
        id: string;
        courseId: string;
        title: string;
        passPercentage: number;
        attemptsAllowed: number;
      };
      update: { courseId: string; title: string; passPercentage: number; attemptsAllowed: number };
    }): Promise<unknown>;
  };
};

export type SeedArgs =
  | { mode: 'slug'; slug: string; dryRun: boolean; allowDraft: boolean }
  | {
      mode: 'all';
      dryRun: boolean;
      allowDraft: boolean;
    };

export const USAGE = [
  'Usage:',
  '  npm run db:seed-quizzes -- --slug=<course-slug> [--dry-run] [--allow-draft]',
  '  npm run db:seed-quizzes -- --all [--dry-run]',
  '',
  '  --slug=<slug>   seed only that course (non-zero exit on any failure, nothing written)',
  '  --all           seed every catalogue quiz file (fault-tolerant, always exits 0)',
  '  --dry-run       print what would be written; no database connection',
  '  --allow-draft   permit a quiz that exists only in data/seed/assessment-drafts/',
].join('\n');

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function parseSeedArgs(argv: readonly string[]): SeedArgs {
  let slug: string | undefined;
  let all = false;
  let dryRun = false;
  let allowDraft = false;
  for (const arg of argv) {
    if (arg.startsWith('--slug=')) {
      if (slug !== undefined) throw new Error('Pass --slug only once.');
      slug = arg.slice('--slug='.length).trim();
    } else if (arg === '--all') all = true;
    else if (arg === '--dry-run') dryRun = true;
    else if (arg === '--allow-draft') allowDraft = true;
    else throw new Error(`Unknown argument "${arg}".`);
  }
  if (slug !== undefined && all) throw new Error('Pass either --slug=<slug> or --all, not both.');
  if (slug !== undefined) {
    if (!SLUG_RE.test(slug)) throw new Error(`"${slug}" is not a valid course slug.`);
    return { mode: 'slug', slug, dryRun, allowDraft };
  }
  if (all) return { mode: 'all', dryRun, allowDraft };
  throw new Error(
    'Refusing to run: pass --slug=<course-slug> to seed one course, or --all to re-write every catalogue quiz.'
  );
}

function isQuizzesFile(value: unknown): value is QuizzesFile {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.courseSlug === 'string' && Array.isArray(v.quizzes);
}

export function loadQuizzesFile(path: string): QuizzesFile {
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (!isQuizzesFile(parsed)) {
    throw new Error(`${path} is not in the expected quizzes-file shape`);
  }
  return parsed;
}

/** Throws on the first structural problem; called for the whole file before any write. */
export function validateQuizzesFile(file: QuizzesFile, label: string): void {
  if (file.quizzes.length === 0) throw new Error(`${label} has no quizzes.`);
  for (const quiz of file.quizzes) {
    if (typeof quiz.quizId !== 'string' || !quiz.quizId) {
      throw new Error(`${label}: a quiz has no quizId.`);
    }
    if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
      throw new Error(`Quiz "${quiz.title}" has no questions.`);
    }
    quiz.questions.forEach((q) => {
      if (!Array.isArray(q.options) || q.options.length < 2) {
        throw new Error(`Quiz "${quiz.title}" has a question with fewer than 2 options.`);
      }
      if (q.correctIndex < 0 || q.correctIndex >= q.options.length) {
        throw new Error(`Quiz "${quiz.title}" has a correctIndex out of range.`);
      }
    });
  }
}

/**
 * A slug resolves the same way `--all` does: a catalogue file on QUIZ_FILES whose `courseSlug`
 * matches. Only when no catalogue file matches is the draft `assessment-drafts/<slug>.quizzes.json`
 * considered — drafts for catalogue courses carry DIFFERENT quizIds, so seeding one would add a
 * second quiz to the course rather than update the live one.
 */
export function resolveQuizFilesForSlug(
  slug: string,
  seedDir: string,
  opts: { allowDraft: boolean }
): ResolvedQuizFile[] {
  const matches: ResolvedQuizFile[] = [];
  for (const name of QUIZ_FILES) {
    const path = join(seedDir, name);
    const file = loadQuizzesFile(path);
    if (file.courseSlug === slug) matches.push({ path, source: 'catalogue', file });
  }
  if (matches.length > 0) return matches;

  const draftPath = join(seedDir, DRAFTS_DIR, `${slug}.quizzes.json`);
  if (!existsSync(draftPath)) {
    throw new Error(
      `No quiz file for course "${slug}": not on QUIZ_FILES and no ${DRAFTS_DIR}/${slug}.quizzes.json.`
    );
  }
  const file = loadQuizzesFile(draftPath);
  if (file.courseSlug !== slug) {
    throw new Error(`${draftPath} declares courseSlug "${file.courseSlug}", not "${slug}".`);
  }
  if (!opts.allowDraft) {
    throw new Error(
      `Course "${slug}" has only a DRAFT quiz (${draftPath}, status: ${file.status ?? 'unset'}). ` +
        'Confirm SME/founder sign-off, then re-run with --allow-draft.'
    );
  }
  return [{ path: draftPath, source: 'draft', file }];
}

export function describeQuizzesFile(resolved: ResolvedQuizFile): string[] {
  const { file, path, source } = resolved;
  const lines = [`${path} [${source}${file.status ? `, status: ${file.status}` : ''}]`];
  for (const quiz of file.quizzes) {
    lines.push(
      `  quiz ${quiz.quizId} "${quiz.title}": ${quiz.questions.length} question(s), ` +
        `pass ${quiz.passPercentage}%, ${quiz.attemptsAllowed} attempt(s)`
    );
  }
  return lines;
}

/** Validates the file and every DB precondition, then writes. Returns quizzes written. */
export async function seedQuizzesFile(
  db: QuizSeedDb,
  file: QuizzesFile,
  label: string
): Promise<number> {
  validateQuizzesFile(file, label);

  const course = await db.lmsCourse.findUnique({
    where: { slug: file.courseSlug },
    select: { id: true },
  });
  if (!course) {
    throw new Error(`Course "${file.courseSlug}" not found — run db:seed-courses first.`);
  }
  for (const quiz of file.quizzes) {
    const existing = await db.lmsQuiz.findUnique({
      where: { id: quiz.quizId },
      select: { courseId: true },
    });
    if (existing && existing.courseId !== course.id) {
      throw new Error(
        `Quiz ${quiz.quizId} already belongs to another course; refusing to move it to "${file.courseSlug}".`
      );
    }
  }

  let seeded = 0;
  for (const quiz of file.quizzes) {
    await db.lmsQuiz.upsert({
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
    // Unchanged questions keep their ids; authored explanations are never erased.
    await writeQuizQuestions(db, quiz.quizId, quiz.questions);
    seeded += 1;
  }
  return seeded;
}

export type RunDeps = {
  seedDir: string;
  /** Called only for a real (non-dry-run) write, after every file has resolved and validated. */
  getDb: () => Promise<QuizSeedDb>;
  log: (msg: string) => void;
  error: (msg: string) => void;
};

/** Returns the process exit code. */
export async function runQuizSeed(argv: readonly string[], deps: RunDeps): Promise<number> {
  let args: SeedArgs;
  try {
    args = parseSeedArgs(argv);
  } catch (e) {
    deps.error(`${e instanceof Error ? e.message : String(e)}\n\n${USAGE}`);
    return 1;
  }

  if (args.mode === 'slug') {
    let resolved: ResolvedQuizFile[];
    try {
      resolved = resolveQuizFilesForSlug(args.slug, deps.seedDir, args);
      for (const r of resolved) validateQuizzesFile(r.file, r.path);
    } catch (e) {
      deps.error(`✗ ${e instanceof Error ? e.message : String(e)} Nothing was written.`);
      return 1;
    }
    for (const r of resolved) describeQuizzesFile(r).forEach((l) => deps.log(l));
    if (args.dryRun) {
      deps.log(`Dry run: nothing written for "${args.slug}" (course existence not checked).`);
      return 0;
    }
    try {
      const db = await deps.getDb();
      let total = 0;
      for (const r of resolved) total += await seedQuizzesFile(db, r.file, r.path);
      deps.log(`✓ Seeded ${total} quiz(zes) for "${args.slug}".`);
      return 0;
    } catch (e) {
      deps.error(`✗ ${args.slug}: ${e instanceof Error ? e.message : String(e)}`);
      return 1;
    }
  }

  // --all: original fault-tolerant behaviour — a bad file is logged and skipped, exit 0.
  let ok = 0;
  let failed = 0;
  let db: QuizSeedDb | undefined;
  for (const name of QUIZ_FILES) {
    const path = join(deps.seedDir, name);
    try {
      const file = loadQuizzesFile(path);
      if (args.dryRun) {
        validateQuizzesFile(file, name);
        describeQuizzesFile({ path, source: 'catalogue', file }).forEach((l) => deps.log(l));
        continue;
      }
      db ??= await deps.getDb();
      const seeded = await seedQuizzesFile(db, file, name);
      ok += seeded;
      deps.log(`✓ ${name}: seeded ${seeded} quiz(zes).`);
    } catch (e) {
      failed += 1;
      deps.error(`✗ ${name}: SKIPPED — ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  deps.log(
    args.dryRun
      ? `Dry run: nothing written (${QUIZ_FILES.length - failed} file(s) valid, ${failed} invalid).`
      : `Quiz seed complete: ${ok} quiz(zes) seeded, ${failed} file(s) skipped.`
  );
  return 0;
}
