import { prisma } from '@/lib/prisma';
import {
  computeProgressFromModules,
  isOnboardingCourse,
  parseOnboardingMeta,
  type CurriculumModuleShape,
} from '@/lib/onboarding/enterprise';

export type OnboardingProgramRow = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  category: string | null;
  level: string | null;
  durationHours: number | null;
  meta: ReturnType<typeof parseOnboardingMeta>;
  enrolled: boolean;
  enrollmentId: string | null;
  progressPercent: number | null;
};

function onboardingWhere() {
  return {
    OR: [
      { category: { equals: 'CARSI Maintenance Company Onboarding', mode: 'insensitive' as const } },
      { slug: 'floor-care-onboarding-operational-readiness' },
    ],
  };
}

export async function listOnboardingProgramsForUser(
  userId: string
): Promise<OnboardingProgramRow[]> {
  const courses = await prisma.lmsCourse.findMany({
    where: onboardingWhere(),
    orderBy: { title: 'asc' },
    include: {
      modules: {
        orderBy: { orderIndex: 'asc' },
        include: {
          lessons: { orderBy: { orderIndex: 'asc' }, select: { id: true } },
        },
      },
    },
  });

  const enrollments = await prisma.lmsEnrollment.findMany({
    where: { studentId: userId, courseId: { in: courses.map((c) => c.id) } },
    select: { id: true, courseId: true },
  });
  const enrollmentByCourse = new Map(enrollments.map((e) => [e.courseId, e]));

  const lessonIds = courses.flatMap((c) => c.modules.flatMap((m) => m.lessons.map((l) => l.id)));
  const progressRows =
    lessonIds.length === 0
      ? []
      : await prisma.lmsLessonProgress.findMany({
          where: { studentId: userId, lessonId: { in: lessonIds }, completed: true },
          select: { lessonId: true },
        });
  const completedSet = new Set(progressRows.map((p) => p.lessonId));

  return courses
    .filter((c) => isOnboardingCourse(c))
    .map((course) => {
      const enrollment = enrollmentByCourse.get(course.id);
      let progressPercent: number | null = null;
      if (enrollment) {
        const modules: CurriculumModuleShape[] = course.modules.map((mod) => ({
          id: mod.id,
          title: mod.title,
          order_index: mod.orderIndex,
          lessons: mod.lessons.map((les) => ({
            id: les.id,
            completed: completedSet.has(les.id),
          })),
        }));
        progressPercent = computeProgressFromModules(modules).percent;
      }
      return {
        id: course.id,
        slug: course.slug,
        title: course.title,
        shortDescription: course.shortDescription,
        category: course.category,
        level: course.level,
        durationHours: course.durationHours != null ? Number(course.durationHours) : null,
        meta: parseOnboardingMeta(course.meta),
        enrolled: Boolean(enrollment),
        enrollmentId: enrollment?.id ?? null,
        progressPercent,
      };
    });
}

export async function getOnboardingCourseBySlug(slug: string) {
  const course = await prisma.lmsCourse.findUnique({
    where: { slug: slug.trim().toLowerCase() },
    include: {
      modules: {
        orderBy: { orderIndex: 'asc' },
        include: { lessons: { orderBy: { orderIndex: 'asc' } } },
      },
    },
  });
  if (!course || !isOnboardingCourse(course)) return null;
  return course;
}
