import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  QUIZ_FILES,
  parseSeedArgs,
  resolveQuizFilesForSlug,
  runQuizSeed,
  type QuizSeedDb,
} from './quiz-seed';

const SEED_DIR = join(process.cwd(), 'data', 'seed');
const WDRF = 'water-damage-restoration-fundamentals';
const WDRF_FILE = JSON.parse(
  readFileSync(join(SEED_DIR, 'water-damage-restoration-fundamentals-quiz.json'), 'utf8')
) as { quizzes: { quizId: string; questions: unknown[] }[] };
/** Read from the seed, so the test follows the course when its quizzes change. */
const WDRF_QUIZ_IDS = WDRF_FILE.quizzes.map((q) => q.quizId);
const WDRF_QUIZ = WDRF_QUIZ_IDS[0];
const WDRF_QUESTIONS = WDRF_FILE.quizzes.reduce((n, q) => n + q.questions.length, 0);

/** Mocked Prisma: every course in the catalogue exists, with id `course:<slug>`. */
function mockDb(existingQuizzes: Record<string, string> = {}) {
  const db = {
    lmsCourse: {
      findUnique: vi.fn(async ({ where }: { where: { slug: string } }) => ({
        id: `course:${where.slug}`,
      })),
    },
    lmsQuiz: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        existingQuizzes[where.id] ? { courseId: existingQuizzes[where.id] } : null
      ),
      upsert: vi.fn(async () => ({})),
    },
    lmsQuizQuestion: {
      findMany: vi.fn(async () => []),
      deleteMany: vi.fn(async () => ({ count: 0 })),
      create: vi.fn(async () => ({})),
      update: vi.fn(async () => ({})),
    },
  };
  return db;
}

function run(argv: string[], db = mockDb(), seedDir = SEED_DIR) {
  const getDb = vi.fn(async () => db as unknown as QuizSeedDb);
  const log = vi.fn();
  const error = vi.fn();
  return {
    db,
    getDb,
    log,
    error,
    done: runQuizSeed(argv, { seedDir, getDb, log, error }),
  };
}

function writeCount(db: ReturnType<typeof mockDb>) {
  return (
    db.lmsQuiz.upsert.mock.calls.length +
    db.lmsQuizQuestion.deleteMany.mock.calls.length +
    db.lmsQuizQuestion.create.mock.calls.length +
    db.lmsQuizQuestion.update.mock.calls.length
  );
}

const tmpDirs: string[] = [];
afterEach(() => {
  while (tmpDirs.length) rmSync(tmpDirs.pop()!, { recursive: true, force: true });
});

describe('parseSeedArgs', () => {
  it('refuses to run with neither --slug nor --all', () => {
    expect(() => parseSeedArgs([])).toThrow(/Refusing to run/);
    expect(() => parseSeedArgs(['--dry-run'])).toThrow(/Refusing to run/);
  });
  it('rejects both, unknown flags and path-like slugs', () => {
    expect(() => parseSeedArgs(['--slug=a', '--all'])).toThrow(/not both/);
    expect(() => parseSeedArgs(['--slg=a'])).toThrow(/Unknown argument/);
    expect(() => parseSeedArgs(['--slug=../secrets'])).toThrow(/not a valid course slug/);
    expect(() => parseSeedArgs(['--slug='])).toThrow(/not a valid course slug/);
  });
  it('parses a slug run', () => {
    expect(parseSeedArgs([`--slug=${WDRF}`, '--dry-run'])).toEqual({
      mode: 'slug',
      slug: WDRF,
      dryRun: true,
      allowDraft: false,
    });
  });
});

describe('runQuizSeed --slug', () => {
  it('touches only that course and only its quiz ids', async () => {
    const r = run([`--slug=${WDRF}`]);
    expect(await r.done).toBe(0);
    const courseSlugs = r.db.lmsCourse.findUnique.mock.calls.map(([a]) => a.where.slug);
    expect(courseSlugs).toEqual([WDRF]);
    const upserted = r.db.lmsQuiz.upsert.mock.calls.map(
      ([a]) => (a as { where: { id: string } }).where.id
    );
    expect(upserted).toEqual(WDRF_QUIZ_IDS);
    const questionQuizIds = new Set([
      ...r.db.lmsQuizQuestion.findMany.mock.calls.map(
        ([a]) => (a as { where: { quizId: string } }).where.quizId
      ),
      ...r.db.lmsQuizQuestion.deleteMany.mock.calls.map(
        ([a]) => (a as { where: { quizId: string } }).where.quizId
      ),
      ...r.db.lmsQuizQuestion.create.mock.calls.map(
        ([a]) => (a as { data: { quizId: string } }).data.quizId
      ),
    ]);
    expect([...questionQuizIds]).toEqual(WDRF_QUIZ_IDS);
    expect(r.db.lmsQuizQuestion.create).toHaveBeenCalledTimes(WDRF_QUESTIONS);
  });

  it('does not use the draft for a catalogue course (drafts carry different quizIds)', () => {
    const resolved = resolveQuizFilesForSlug(WDRF, SEED_DIR, { allowDraft: true });
    expect(resolved.map((r) => r.source)).toEqual(['catalogue']);
    expect(resolved[0].file.quizzes[0].quizId).toBe(WDRF_QUIZ);
  });

  it('unknown slug exits non-zero and never connects or writes', async () => {
    const r = run(['--slug=no-such-course']);
    expect(await r.done).toBe(1);
    expect(r.getDb).not.toHaveBeenCalled();
    expect(writeCount(r.db)).toBe(0);
    expect(r.error.mock.calls[0][0]).toMatch(/No quiz file for course "no-such-course"/);
  });

  it('missing --slug and --all exits non-zero and never connects', async () => {
    const r = run([]);
    expect(await r.done).toBe(1);
    expect(r.getDb).not.toHaveBeenCalled();
    expect(writeCount(r.db)).toBe(0);
  });

  it('a draft-only course (Level 2 Mould) needs --allow-draft', async () => {
    const refused = run(['--slug=level-2-mould-remediation']);
    expect(await refused.done).toBe(1);
    expect(refused.getDb).not.toHaveBeenCalled();
    expect(refused.error.mock.calls[0][0]).toMatch(/--allow-draft/);

    const allowed = run(['--slug=level-2-mould-remediation', '--allow-draft']);
    expect(await allowed.done).toBe(0);
    expect(allowed.db.lmsCourse.findUnique.mock.calls.map(([a]) => a.where.slug)).toEqual([
      'level-2-mould-remediation',
    ]);
    expect(allowed.db.lmsQuiz.upsert).toHaveBeenCalledTimes(1);
  });

  it('--dry-run prints the plan and never connects', async () => {
    const r = run([`--slug=${WDRF}`, '--dry-run']);
    expect(await r.done).toBe(0);
    expect(r.getDb).not.toHaveBeenCalled();
    expect(r.log.mock.calls.flat().join('\n')).toContain(WDRF_QUIZ);
  });

  it('refuses to re-parent a quiz id owned by another course, writing nothing', async () => {
    const r = run([`--slug=${WDRF}`], mockDb({ [WDRF_QUIZ]: 'course:someone-else' }));
    expect(await r.done).toBe(1);
    expect(writeCount(r.db)).toBe(0);
  });

  it('an invalid quiz anywhere in the file writes nothing', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'quiz-seed-'));
    tmpDirs.push(dir);
    for (const name of QUIZ_FILES) {
      writeFileSync(join(dir, name), readFileSync(join(SEED_DIR, name)));
    }
    mkdirSync(join(dir, 'assessment-drafts'));
    writeFileSync(
      join(dir, 'assessment-drafts', 'broken-course.quizzes.json'),
      JSON.stringify({
        courseSlug: 'broken-course',
        quizzes: [
          {
            quizId: 'q1',
            title: 'ok',
            passPercentage: 70,
            attemptsAllowed: 3,
            questions: [{ questionText: 'a', options: ['x', 'y'], correctIndex: 0 }],
          },
          {
            quizId: 'q2',
            title: 'bad',
            passPercentage: 70,
            attemptsAllowed: 3,
            questions: [{ questionText: 'b', options: ['x', 'y'], correctIndex: 5 }],
          },
        ],
      })
    );
    const r = run(['--slug=broken-course', '--allow-draft'], mockDb(), dir);
    expect(await r.done).toBe(1);
    expect(r.getDb).not.toHaveBeenCalled();
    expect(writeCount(r.db)).toBe(0);
  });
});

describe('runQuizSeed --all', () => {
  it('keeps the catalogue-wide behaviour: every QUIZ_FILES course, exit 0', async () => {
    const r = run(['--all']);
    expect(await r.done).toBe(0);
    expect(r.db.lmsCourse.findUnique).toHaveBeenCalledTimes(QUIZ_FILES.length);
    expect(r.error).not.toHaveBeenCalled();
  });
});
