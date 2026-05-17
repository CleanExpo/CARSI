import { prisma } from '@/lib/prisma';
import { normalizeEnrollmentStatus } from '@/lib/server/learner-dashboard-data';

export interface PathwayCourseProgress {
  course_id: string;
  course_title: string;
  course_slug: string;
  order_index: number;
  enrolled: boolean;
  completion_percentage: number;
  completed: boolean;
}

export interface PathwayProgressRow {
  pathway_id: string;
  slug: string;
  title: string;
  description: string | null;
  target_certification: string | null;
  courses_total: number;
  courses_completed: number;
  progress_percent: number;
  courses: PathwayCourseProgress[];
}

function courseCompletionPercent(
  lessonIds: string[],
  progressByLesson: Map<string, { completed: boolean }>,
  status: string,
  completedAt: Date | null
): { percent: number; completed: boolean } {
  if (lessonIds.length === 0) {
    const done = normalizeEnrollmentStatus(status) === 'completed' || completedAt != null;
    return { percent: done ? 100 : 0, completed: done };
  }
  let done = 0;
  for (const id of lessonIds) {
    if (progressByLesson.get(id)?.completed) done += 1;
  }
  const percent = Math.min(100, Math.round((done / lessonIds.length) * 100));
  const completed = done >= lessonIds.length;
  return { percent, completed };
}

export async function getPathwayProgressForStudent(
  studentId: string
): Promise<PathwayProgressRow[]> {
  const pathways = await prisma.lmsLearningPathway.findMany({
    where: { isPublished: true },
    orderBy: { orderIndex: 'asc' },
    include: {
      courses: {
        orderBy: { orderIndex: 'asc' },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              slug: true,
              isPublished: true,
              modules: { select: { lessons: { select: { id: true } } } },
            },
          },
        },
      },
    },
  });

  const enrollments = await prisma.lmsEnrollment.findMany({
    where: { studentId, status: { not: 'cancelled' } },
    select: {
      courseId: true,
      status: true,
      completedAt: true,
    },
  });
  const enrollmentByCourse = new Map(enrollments.map((e) => [e.courseId, e]));

  const allLessonIds = pathways.flatMap((p) =>
    p.courses.flatMap((pc) => pc.course.modules.flatMap((m) => m.lessons.map((l) => l.id)))
  );

  const progressRows =
    allLessonIds.length === 0
      ? []
      : await prisma.lmsLessonProgress.findMany({
          where: { studentId, lessonId: { in: allLessonIds } },
          select: { lessonId: true, completed: true },
        });
  const progressByLesson = new Map(progressRows.map((p) => [p.lessonId, p]));

  return pathways
    .filter((p) => p.courses.length > 0)
    .map((p) => {
      const courses: PathwayCourseProgress[] = p.courses
        .filter((pc) => pc.course.isPublished)
        .map((pc) => {
          const lessonIds = pc.course.modules.flatMap((m) => m.lessons.map((l) => l.id));
          const en = enrollmentByCourse.get(pc.courseId);
          const { percent, completed } = en
            ? courseCompletionPercent(
                lessonIds,
                progressByLesson,
                en.status,
                en.completedAt
              )
            : { percent: 0, completed: false };

          return {
            course_id: pc.courseId,
            course_title: pc.course.title,
            course_slug: pc.course.slug,
            order_index: pc.orderIndex,
            enrolled: Boolean(en),
            completion_percentage: percent,
            completed,
          };
        });

      const total = courses.length;
      const completedCount = courses.filter((c) => c.completed).length;
      const progressPercent = total > 0 ? Math.round((completedCount / total) * 100) : 0;

      return {
        pathway_id: p.id,
        slug: p.slug,
        title: p.title,
        description: p.description,
        target_certification: p.targetCertification,
        courses_total: total,
        courses_completed: completedCount,
        progress_percent: progressPercent,
        courses,
      };
    });
}
