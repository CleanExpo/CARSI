import { prisma } from '@/lib/prisma';
import { lmsPublishedCourseWhere } from '@/lib/server/public-courses-list';

export interface CohortCourseRow {
  course_id: string;
  course_title: string;
  course_slug: string;
  discipline: string | null;
  enrollments_total: number;
  enrollments_active: number;
  enrollments_completed: number;
  completion_rate_percent: number;
  enrollments_last_30_days: number;
}

export interface CohortSummary {
  total_enrollments: number;
  active_learners_30d: number;
  completions_30d: number;
  courses: CohortCourseRow[];
  by_discipline: Array<{
    discipline: string;
    enrollments: number;
    completed: number;
  }>;
}

const thirtyDaysAgo = () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

export async function getCohortAnalytics(): Promise<CohortSummary> {
  const since = thirtyDaysAgo();

  const courses = await prisma.lmsCourse.findMany({
    where: lmsPublishedCourseWhere,
    select: {
      id: true,
      title: true,
      slug: true,
      iicrcDiscipline: true,
      modules: { select: { lessons: { select: { id: true } } } },
      enrollments: {
        select: {
          id: true,
          studentId: true,
          status: true,
          completedAt: true,
          enrolledAt: true,
        },
      },
    },
    orderBy: { title: 'asc' },
  });

  const allLessonIds = courses.flatMap((c) =>
    c.modules.flatMap((m) => m.lessons.map((l) => l.id))
  );

  const progress =
    allLessonIds.length === 0
      ? []
      : await prisma.lmsLessonProgress.findMany({
          where: { lessonId: { in: allLessonIds }, completed: true },
          select: { studentId: true, lessonId: true },
        });

  const completedLessonsByStudent = new Map<string, Set<string>>();
  for (const p of progress) {
    if (!completedLessonsByStudent.has(p.studentId)) {
      completedLessonsByStudent.set(p.studentId, new Set());
    }
    completedLessonsByStudent.get(p.studentId)!.add(p.lessonId);
  }

  const disciplineAgg = new Map<string, { enrollments: number; completed: number }>();
  let totalEnrollments = 0;
  let completions30d = 0;
  const activeStudents30d = new Set<string>();

  const courseRows: CohortCourseRow[] = courses.map((course) => {
    const lessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
    const totalLessons = lessonIds.length;
    let completedCount = 0;
    let activeCount = 0;
    let last30 = 0;

    for (const en of course.enrollments) {
      totalEnrollments += 1;
      const status = en.status.toLowerCase();
      if (status !== 'cancelled') activeCount += 1;
      if (en.completedAt || status === 'completed') completedCount += 1;
      if (en.enrolledAt >= since) last30 += 1;
      if (en.enrolledAt >= since) activeStudents30d.add(en.studentId);
      if (en.completedAt && en.completedAt >= since) completions30d += 1;

      const disc = course.iicrcDiscipline ?? 'Other';
      const agg = disciplineAgg.get(disc) ?? { enrollments: 0, completed: 0 };
      agg.enrollments += 1;
      if (en.completedAt || status === 'completed') agg.completed += 1;
      disciplineAgg.set(disc, agg);
    }

    let lessonCompleteEnrollments = 0;
    for (const en of course.enrollments) {
      if (totalLessons === 0) continue;
      const done = completedLessonsByStudent.get(en.studentId);
      if (done && lessonIds.every((id) => done.has(id))) lessonCompleteEnrollments += 1;
    }

    const completionRate =
      course.enrollments.length > 0
        ? Math.round((lessonCompleteEnrollments / course.enrollments.length) * 100)
        : 0;

    return {
      course_id: course.id,
      course_title: course.title,
      course_slug: course.slug,
      discipline: course.iicrcDiscipline,
      enrollments_total: course.enrollments.length,
      enrollments_active: activeCount,
      enrollments_completed: completedCount,
      completion_rate_percent: completionRate,
      enrollments_last_30_days: last30,
    };
  });

  courseRows.sort((a, b) => b.enrollments_total - a.enrollments_total);

  return {
    total_enrollments: totalEnrollments,
    active_learners_30d: activeStudents30d.size,
    completions_30d: completions30d,
    courses: courseRows,
    by_discipline: [...disciplineAgg.entries()]
      .map(([discipline, v]) => ({ discipline, ...v }))
      .sort((a, b) => b.enrollments - a.enrollments),
  };
}
