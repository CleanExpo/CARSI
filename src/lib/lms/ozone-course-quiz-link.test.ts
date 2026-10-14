/**
 * Codex review codex-carsi-b7077ba9 P1-QUIZ-UNREACHABLE.
 *
 * The free ozone/hydroxyl course shipped an eight-question quiz that no lesson
 * linked to. The learner shell (LearnCourseShell) and the checkpoint server
 * (lesson-checkpoint.ts) only open a quiz that a lesson names, through
 * `extractQuizIdFromLesson`. Meanwhile `syncEnrollmentCompletion` requires a
 * passing attempt on EVERY seeded course quiz, so an unlinked quiz is both
 * unopenable and a permanent block on completion.
 *
 * This test reads the real seed files (the same ones scripts/seed-courses-catalog.ts
 * and scripts/seed-all-quizzes.ts write to the database) and walks the real path:
 * a lesson resolves to the quiz id, the quiz sits in the learner curriculum, a
 * fully correct attempt passes, and completion is reached only after that pass.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { extractQuizIdFromLesson } from './quiz-from-lesson';
import { computeQuizResult } from '@/lib/server/lms-completion';

const SLUG = 'ozone-and-hydroxyl-generators-what-the-evidence-says';

type Lesson = {
  id: string;
  title: string;
  contentType: string;
  contentBody: string | null;
  resources: { url?: string }[] | null;
};
type Course = { slug: string; status: string; modules: { lessons: Lesson[] }[] };
type QuizFile = {
  courseSlug: string;
  quizzes: {
    quizId: string;
    lessonTitle?: string;
    passPercentage: number;
    questions: { correctIndex: number; options: string[]; points?: number }[];
  }[];
};

const seedDir = join(process.cwd(), 'data', 'seed');
const catalogue = JSON.parse(readFileSync(join(seedDir, 'courses-catalog.json'), 'utf8')) as {
  courses: Course[];
};
const quizFile = JSON.parse(readFileSync(join(seedDir, `${SLUG}-quiz.json`), 'utf8')) as QuizFile;
const course = catalogue.courses.find((c) => c.slug === SLUG);
const lessons = course?.modules.flatMap((m) => m.lessons) ?? [];
const quiz = quizFile.quizzes[0];

const state = vi.hoisted(() => ({
  enrollment: null as null | { id: string; status: string; completedAt: Date | null },
  lessonIds: [] as string[],
  quizIds: [] as string[],
  passedQuizIds: [] as string[],
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsCourse: {
      findUnique: vi.fn(async () => ({
        modules: [{ lessons: state.lessonIds.map((id) => ({ id })) }],
      })),
    },
    lmsEnrollment: {
      findUnique: vi.fn(async () => state.enrollment),
      update: vi.fn(async (args: { data: { status: string; completedAt: Date | null } }) => {
        state.enrollment = { ...(state.enrollment as NonNullable<typeof state.enrollment>), ...args.data };
        return state.enrollment;
      }),
    },
    // Every lesson marked complete by the learner.
    lmsLessonProgress: { count: vi.fn(async () => state.lessonIds.length) },
    lmsQuiz: { findMany: vi.fn(async () => state.quizIds.map((id) => ({ id }))) },
    lmsQuizAttempt: {
      findMany: vi.fn(async () => state.passedQuizIds.map((quizId) => ({ quizId }))),
    },
  },
}));

vi.mock('@/lib/server/iicrc-cec-submission', () => ({
  processIicrcCecSubmissionForEnrollment: vi.fn(async () => {}),
}));

const { syncEnrollmentCompletion } = await import('@/lib/server/enrollment-service');

describe('free ozone/hydroxyl course: the knowledge check is reachable', () => {
  it('has exactly one catalogue entry and one eight-question quiz for it', () => {
    expect(course).toBeDefined();
    expect(quizFile.courseSlug).toBe(SLUG);
    expect(quizFile.quizzes).toHaveLength(1);
    expect(quiz.questions).toHaveLength(8);
  });

  it('a lesson in the learner curriculum resolves to the seeded quiz id', () => {
    const linked = lessons.filter(
      (l) => extractQuizIdFromLesson(l.contentType, l.contentBody, l.resources ?? []) === quiz.quizId,
    );
    expect(linked).toHaveLength(1);
    // seed-all-quizzes.ts reports the lesson by title; it must name the linking lesson.
    expect(quiz.lessonTitle).toBe(linked[0].title);
  });

  it('no lesson links to a quiz other than the seeded one', () => {
    const others = lessons
      .map((l) => extractQuizIdFromLesson(l.contentType, l.contentBody, l.resources ?? []))
      .filter((id): id is string => id !== null && id !== quiz.quizId);
    expect(others).toEqual([]);
  });

  it('a fully correct attempt passes at the seeded pass mark', () => {
    const total = quiz.questions.reduce((sum, q) => sum + (q.points ?? 1), 0);
    expect(computeQuizResult(total, total, quiz.passPercentage).passed).toBe(true);
  });

  describe('completion', () => {
    beforeEach(() => {
      state.enrollment = { id: 'enr-ozone', status: 'active', completedAt: null };
      state.lessonIds = lessons.map((l) => l.id);
      state.quizIds = [quiz.quizId];
      state.passedQuizIds = [];
    });

    it('is not reached with every lesson done but no passing attempt', async () => {
      await syncEnrollmentCompletion('enr-ozone', 'student-1', 'course-ozone');
      expect(state.enrollment?.status).toBe('active');
    });

    it('is reached once the linked quiz has a passing attempt', async () => {
      state.passedQuizIds = [quiz.quizId];
      await syncEnrollmentCompletion('enr-ozone', 'student-1', 'course-ozone');
      expect(state.enrollment?.status).toBe('completed');
      expect(state.enrollment?.completedAt).not.toBeNull();
    });
  });
});
