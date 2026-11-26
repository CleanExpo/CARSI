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
import { resolveFocusCourseSlug } from '@/lib/lms/learner-journey-query';
import { isInteractiveLessonResource, parseLessonResources } from '@/lib/lms/lesson-resources';
import { prisma } from '@/lib/prisma';
import { ACCESS_GRANTING_STATUS_LIST } from '@/lib/server/enrollment-access';
import { getNextCourseRecommendationsForStudent } from '@/lib/server/renewal-summary';
import {
  EMPTY_LEARNER_LEARNING_JOURNEY,
  type LearnerLearningJourneyPayload,
} from '@/types/learner-learning-journey';

function lessonHasInteractive(resources: ReturnType<typeof parseLessonResources>): boolean {
  return resources.some(isInteractiveLessonResource);
}

type CurriculumSnapshot = {
  progressRows: EnrollmentProgressRow[];
  nextLessons: NextLessonRow[];
  enrolledSlugs: Set<string>;
};

async function loadCurriculumSnapshot(userId: string): Promise<CurriculumSnapshot> {
  const enrollments = await prisma.lmsEnrollment.findMany({
    where: {
      studentId: userId,
      status: { in: [...ACCESS_GRANTING_STATUS_LIST] },
    },
    select: {
      id: true,
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

  const progressRows =
    lessonIds.length > 0
      ? await prisma.lmsLessonProgress.findMany({
          where: { studentId: userId, lessonId: { in: lessonIds } },
          select: { lessonId: true, completed: true },
        })
      : [];
  const completedSet = new Set(progressRows.filter((p) => p.completed).map((p) => p.lessonId));

  const progressOut: EnrollmentProgressRow[] = [];
  const nextLessons: NextLessonRow[] = [];
  const enrolledSlugs = new Set<string>();

  for (const e of enrollments) {
    enrolledSlugs.add(e.course.slug);
    let total = 0;
    let done = 0;
    let nextPushed = false;

    for (const m of e.course.modules) {
      for (const l of m.lessons) {
        total += 1;
        if (completedSet.has(l.id)) {
          done += 1;
          continue;
        }
        if (!nextPushed) {
          const resources = parseLessonResources(l.resources);
          nextLessons.push({
            course_slug: e.course.slug,
            course_title: e.course.title,
            lesson_id: l.id,
            lesson_title: l.title,
            content_type: l.contentType ?? 'text',
            has_interactive: lessonHasInteractive(resources),
          });
          nextPushed = true;
        }
      }
    }

    const allLessonsComplete = total > 0 && done >= total;
    const completionPercentage =
      total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;

    progressOut.push({
      id: e.id,
      course_slug: e.course.slug,
      course_title: e.course.title,
      iicrc_discipline: e.course.iicrcDiscipline,
      completion_percentage: completionPercentage,
      last_lesson_id: e.lastAccessedLessonId,
      all_lessons_complete: allLessonsComplete,
    });
  }

  return { progressRows: progressOut, nextLessons, enrolledSlugs };
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

  if (attempts.length === 0) return [];

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

  const lessonByQuiz = new Map<string, string>();
  for (const a of attempts) {
    if (lessonByQuiz.has(a.quiz.id)) continue;
    for (const lesson of quizLessons) {
      if (lesson.module.courseId !== a.quiz.courseId) continue;
      if (lesson.contentBody?.includes(a.quiz.id)) {
        lessonByQuiz.set(a.quiz.id, lesson.id);
        break;
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
  if (!userId?.trim()) return EMPTY_LEARNER_LEARNING_JOURNEY;

  try {
    const [courseRecommendations, snapshot, quizGaps, courseBySlug] = await Promise.all([
      getNextCourseRecommendationsForStudent(userId),
      loadCurriculumSnapshot(userId),
      loadQuizGaps(userId),
      loadPathwayCatalog(),
    ]);

    const focus = resolveFocusCourseSlug(options?.focusCourseSlug, snapshot.enrolledSlugs);

    const completedSlugs = new Set(
      snapshot.progressRows.filter((e) => e.all_lessons_complete).map((e) => e.course_slug)
    );
    const completedDisciplines = snapshot.progressRows
      .filter((e) => e.all_lessons_complete && e.iicrc_discipline)
      .map((e) => e.iicrc_discipline as string);

    const pathwayNext = buildPathwayNext({
      completedDisciplines,
      enrolledSlugs: snapshot.enrolledSlugs,
      completedSlugs,
      courseBySlug,
    });

    const activityNudges = buildActivityNudges({
      enrollments: snapshot.progressRows,
      nextLessons: snapshot.nextLessons,
      liveOffers: getLiveInteractiveLearningOffers(),
      focusCourseSlug: focus,
    });

    const skillGaps = buildSkillGaps(quizGaps);

    return assembleLearnerJourney({
      courseRecommendations,
      activityNudges,
      skillGaps,
      pathwayNext,
    });
  } catch (err) {
    console.error('[learner-learning-journey]', err);
    return EMPTY_LEARNER_LEARNING_JOURNEY;
  }
}