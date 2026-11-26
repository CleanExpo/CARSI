import { getLiveInteractiveLearningOffers } from '@/lib/lms/interactive-learning-catalog';
import {
  assembleLearnerJourney,
  buildActivityNudges,
  buildPathwayNext,
  buildSkillGaps,
  type EnrollmentProgressRow,
  type NextLessonRow,
  type QuizGapRow,
} from '@/lib/lms/learner-journey-insights';
import { isInteractiveLessonResource, type LessonResource } from '@/lib/lms/lesson-resources';
import { prisma } from '@/lib/prisma';
import { getNextCourseRecommendationsForStudent } from '@/lib/server/renewal-summary';
import type { LearnerLearningJourneyPayload } from '@/types/learner-learning-journey';

function parseResources(raw: unknown): LessonResource[] {
  if (!Array.isArray(raw)) return [];
  return raw as LessonResource[];
}

function lessonHasInteractive(resources: LessonResource[]): boolean {
  return resources.some(isInteractiveLessonResource);
}

async function loadEnrollmentProgress(userId: string): Promise<EnrollmentProgressRow[]> {
  const enrollments = await prisma.lmsEnrollment.findMany({
    where: { studentId: userId },
    select: {
      id: true,
      status: true,
      lastAccessedLessonId: true,
      course: {
        select: {
          title: true,
          slug: true,
          iicrcDiscipline: true,
          modules: {
            orderBy: { orderIndex: 'asc' },
            select: {
              lessons: {
                orderBy: { orderIndex: 'asc' },
                select: { id: true, title: true, contentType: true, resources: true },
              },
            },
          },
        },
      },
    },
  });

  const allLessonIds: string[] = [];
  for (const e of enrollments) {
    for (const m of e.course.modules) {
      for (const l of m.lessons) allLessonIds.push(l.id);
    }
  }

  const progressRows =
    allLessonIds.length > 0
      ? await prisma.lmsLessonProgress.findMany({
          where: { studentId: userId, lessonId: { in: allLessonIds } },
          select: { lessonId: true, completed: true },
        })
      : [];
  const completedSet = new Set(progressRows.filter((p) => p.completed).map((p) => p.lessonId));

  return enrollments.map((e) => {
    let total = 0;
    let done = 0;
    for (const m of e.course.modules) {
      for (const l of m.lessons) {
        total += 1;
        if (completedSet.has(l.id)) done += 1;
      }
    }
    const completionPercentage = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
    return {
      id: e.id,
      course_slug: e.course.slug,
      course_title: e.course.title,
      iicrc_discipline: e.course.iicrcDiscipline,
      completion_percentage: completionPercentage,
      last_lesson_id: e.lastAccessedLessonId,
      all_lessons_complete: total > 0 && done >= total,
    };
  });
}

async function loadNextLessons(userId: string): Promise<NextLessonRow[]> {
  const enrollments = await prisma.lmsEnrollment.findMany({
    where: {
      studentId: userId,
      status: { notIn: ['revoked', 'cancelled', 'completed', 'complete'] },
    },
    select: {
      course: {
        select: {
          slug: true,
          title: true,
          modules: {
            orderBy: { orderIndex: 'asc' },
            select: {
              lessons: {
                orderBy: { orderIndex: 'asc' },
                select: {
                  id: true,
                  title: true,
                  contentType: true,
                  resources: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const lessonIds: string[] = [];
  for (const e of enrollments) {
    for (const m of e.course.modules) {
      for (const l of m.lessons) lessonIds.push(l.id);
    }
  }

  const progress =
    lessonIds.length > 0
      ? await prisma.lmsLessonProgress.findMany({
          where: { studentId: userId, lessonId: { in: lessonIds } },
          select: { lessonId: true, completed: true },
        })
      : [];
  const done = new Set(progress.filter((p) => p.completed).map((p) => p.lessonId));

  const out: NextLessonRow[] = [];
  for (const e of enrollments) {
    for (const m of e.course.modules) {
      for (const l of m.lessons) {
        if (done.has(l.id)) continue;
        const resources = parseResources(l.resources);
        out.push({
          course_slug: e.course.slug,
          course_title: e.course.title,
          lesson_id: l.id,
          lesson_title: l.title,
          content_type: l.contentType ?? 'text',
          has_interactive: lessonHasInteractive(resources),
        });
        break;
      }
      if (out.some((r) => r.course_slug === e.course.slug)) break;
    }
  }
  return out;
}

async function loadQuizGaps(userId: string): Promise<QuizGapRow[]> {
  const attempts = await prisma.lmsQuizAttempt.findMany({
    where: { studentId: userId, voidedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 40,
    select: {
      scorePercent: true,
      passed: true,
      quiz: {
        select: {
          id: true,
          title: true,
          course: { select: { slug: true, title: true } },
          courseId: true,
        },
      },
    },
  });

  const lessonByQuiz = new Map<string, string | null>();
  if (attempts.length > 0) {
    const courseIds = [...new Set(attempts.map((a) => a.quiz.courseId))];
    const quizLessons = await prisma.lmsLesson.findMany({
      where: {
        module: { courseId: { in: courseIds } },
        OR: [{ contentType: 'quiz' }, { contentBody: { contains: 'quiz' } }],
      },
      select: {
        id: true,
        contentBody: true,
        module: { select: { courseId: true } },
      },
    });
    for (const lesson of quizLessons) {
      const lessonCourseId = lesson.module.courseId;
      for (const a of attempts) {
        if (a.quiz.courseId !== lessonCourseId) continue;
        if (lesson.contentBody?.includes(a.quiz.id)) {
          lessonByQuiz.set(a.quiz.id, lesson.id);
          break;
        }
      }
    }
  }

  const seenQuiz = new Set<string>();
  const rows: QuizGapRow[] = [];
  for (const a of attempts) {
    if (seenQuiz.has(a.quiz.id)) continue;
    seenQuiz.add(a.quiz.id);
    if (a.passed && a.scorePercent >= 80) continue;
    rows.push({
      quiz_id: a.quiz.id,
      quiz_title: a.quiz.title,
      course_slug: a.quiz.course.slug,
      course_title: a.quiz.course.title,
      score_percent: a.scorePercent,
      passed: a.passed,
      lesson_id: lessonByQuiz.get(a.quiz.id) ?? null,
    });
  }
  return rows;
}

async function loadPathwayCatalog(): Promise<Map<string, { title: string; discipline: string | null }>> {
  const rows = await prisma.lmsCourse.findMany({
    where: { OR: [{ isPublished: true }, { status: 'published' }] },
    select: { slug: true, title: true, iicrcDiscipline: true },
    take: 120,
  });
  return new Map(rows.map((r) => [r.slug, { title: r.title, discipline: r.iicrcDiscipline }]));
}

export async function getLearnerLearningJourney(
  userId: string,
  options?: { focusCourseSlug?: string }
): Promise<LearnerLearningJourneyPayload> {
  const [courseRecommendations, enrollments, nextLessons, quizGaps, courseBySlug] = await Promise.all([
    getNextCourseRecommendationsForStudent(userId),
    loadEnrollmentProgress(userId),
    loadNextLessons(userId),
    loadQuizGaps(userId),
    loadPathwayCatalog(),
  ]);

  const enrolledSlugs = new Set(enrollments.map((e) => e.course_slug));
  const completedSlugs = new Set(
    enrollments.filter((e) => e.all_lessons_complete).map((e) => e.course_slug)
  );
  const completedDisciplines = enrollments
    .filter((e) => e.all_lessons_complete && e.iicrc_discipline)
    .map((e) => e.iicrc_discipline as string);

  const pathwayNext = buildPathwayNext({
    completedDisciplines,
    enrolledSlugs,
    completedSlugs,
    courseBySlug,
  });

  const activityNudges = buildActivityNudges({
    enrollments,
    nextLessons,
    liveOffers: getLiveInteractiveLearningOffers(),
    focusCourseSlug: options?.focusCourseSlug,
  });

  const skillGaps = buildSkillGaps(quizGaps);

  return assembleLearnerJourney({
    courseRecommendations,
    activityNudges,
    skillGaps,
    pathwayNext,
  });
}