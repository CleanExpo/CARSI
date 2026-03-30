import type { AdminCatalogCourse } from '@/lib/admin/load-admin-catalog';
import { buildAdminCatalogFromSeed } from '@/lib/lms-seed-catalog';
import { prisma } from '@/lib/prisma';

export type AdminCourseModuleProgress = {
  moduleNo: number;
  title: string;
  lessonTitle: string;
  completed: boolean;
};

export type AdminCourseProgressForUser = {
  enrollmentId: string;
  courseSlug: string;
  courseTitle: string;
  totalLessons: number;
  completedLessons: number;
  completionPct: number;
  completedModules: number;
  remainingLessons: number;
  modules: AdminCourseModuleProgress[];
};

export type AdminUserProgress = {
  userId: string;
  email: string;
  fullName: string | null;
  role: string | null;
  isActive: boolean;
  createdAt: string;
  lastActiveAt: string | null;
  overallCompletionPct: number;
  enrollments: AdminCourseProgressForUser[];
};

export type AdminDashboardClientData = {
  generatedAt: string;
  kpis: {
    totalUsers: number;
    activeLearners: number;
    totalEnrollments: number;
    completedEnrollments: number;
    completionRatePct: number;
  };
  charts: {
    statusPie: { name: string; value: number }[];
    completionByCourseBar: { courseTitle: string; completionPct: number }[];
    completionsLine: { date: string; completions: number }[];
    enrollmentsPerCourse: { name: string; enrollments: number }[];
    catalogCategoryPie: { name: string; value: number }[];
  };
  catalogMeta: {
    totalCoursesInCatalog: number;
    excelPath: string;
  };
  /** Workbook-only courses for grant-access picker */
  catalogCourses: { slug: string; title: string; moduleCount: number }[];
  users: AdminUserProgress[];
};

function normalizeStatus(status: string): 'completed' | 'active' | 'other' {
  const s = (status ?? '').toLowerCase().trim();
  if (s === 'completed' || s === 'complete') return 'completed';
  if (['active', 'enrolled', 'in_progress', 'in progress', 'started'].includes(s)) return 'active';
  return 'other';
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function completionPct(completed: number, total: number) {
  if (total <= 0) return completed > 0 ? 100 : 0;
  return Math.round((clamp(completed, 0, total) / total) * 100);
}

function buildModuleProgress(course: AdminCatalogCourse, completedModulesCount: number) {
  const totalModules = course.modules.length;
  const completed = clamp(completedModulesCount, 0, totalModules);
  return course.modules
    .slice()
    .sort((a, b) => a.moduleNo - b.moduleNo)
    .map((m, idx) => ({
      moduleNo: m.moduleNo,
      title: m.title,
      lessonTitle: m.lessons[0]?.title ?? m.title,
      completed: idx < completed,
    }));
}

export async function getAdminDashboardData(): Promise<AdminDashboardClientData> {
  const catalog = buildAdminCatalogFromSeed();
  const catalogCourses = catalog.courses;
  const catalogBySlug = new Map(catalogCourses.map((c) => [c.slug, c]));
  const catalogSlugs = Array.from(catalogBySlug.keys());

  // --- Users ---
  const users = await prisma.lmsUser.findMany({
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  const userIds = users.map((u) => u.id);

  // --- Enrollments (only for courses in catalog) ---
  const enrollments = await prisma.lmsEnrollment.findMany({
    where: { course: { slug: { in: catalogSlugs } } },
    select: {
      id: true,
      studentId: true,
      courseId: true,
      status: true,
      enrolledAt: true,
      completedAt: true,
      lastAccessedLessonId: true,
      course: { select: { id: true, slug: true, title: true } },
    },
  });

  const courseIds = Array.from(new Set(enrollments.map((e) => e.courseId)));

  const userEnrollmentsByUserId = new Map<string, typeof enrollments>();
  for (const e of enrollments) {
    const arr = userEnrollmentsByUserId.get(e.studentId) ?? [];
    arr.push(e);
    userEnrollmentsByUserId.set(e.studentId, arr);
  }

  // --- Completed lesson counts grouped by (studentId, courseId) ---
  const completedLessonCounts = new Map<string, number>();
  if (userIds.length > 0 && courseIds.length > 0) {
    const completedRows = await prisma.lmsLessonProgress.findMany({
      where: {
        studentId: { in: userIds },
        completed: true,
        lesson: { module: { courseId: { in: courseIds } } },
      },
      select: {
        studentId: true,
        lesson: {
          select: {
            module: { select: { courseId: true } },
          },
        },
      },
    });

    for (const row of completedRows) {
      const courseId = row.lesson?.module?.courseId;
      if (!courseId) continue;
      const key = `${row.studentId}-${courseId}`;
      completedLessonCounts.set(key, (completedLessonCounts.get(key) ?? 0) + 1);
    }
  }

  // --- Last activity per user ---
  const lastActiveRows =
    userIds.length > 0
      ? await prisma.lmsLessonProgress.groupBy({
          by: ['studentId'],
          where: { studentId: { in: userIds } },
          _max: { lastAccessedAt: true },
        })
      : [];

  const lastActiveByUserId = new Map<string, Date | null>();
  for (const r of lastActiveRows) {
    lastActiveByUserId.set(r.studentId, r._max.lastAccessedAt ?? null);
  }

  // --- KPIs ---
  const totalUsers = users.length;
  const totalEnrollments = enrollments.length;
  const completedEnrollments = enrollments.filter((e) => normalizeStatus(e.status) === 'completed').length;
  const activeLearners = enrollments.filter((e) => normalizeStatus(e.status) === 'active').length;

  const completionRatePct =
    totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0;

  // --- Charts data ---
  const statusPie = [
    { name: 'Active', value: activeLearners },
    { name: 'Completed', value: completedEnrollments },
  ];

  const enrollmentsByCourseId = new Map<string, { total: number; completed: number; slug: string; title: string }>();
  for (const e of enrollments) {
    const n = enrollmentsByCourseId.get(e.courseId) ?? {
      total: 0,
      completed: 0,
      slug: e.course.slug,
      title: e.course.title,
    };
    n.total += 1;
    if (normalizeStatus(e.status) === 'completed') n.completed += 1;
    enrollmentsByCourseId.set(e.courseId, n);
  }

  const completionByCourseBar = Array.from(enrollmentsByCourseId.values())
    .map((c) => ({
      courseTitle: c.title,
      completionPct: c.total > 0 ? Math.round((c.completed / c.total) * 100) : 0,
    }))
    .sort((a, b) => b.completionPct - a.completionPct);

  const today = new Date();
  const daysBack = 14;
  const dayKeys: string[] = [];
  for (let i = daysBack; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dayKeys.push(key);
  }
  const completionsByDay = new Map<string, number>();
  for (const k of dayKeys) completionsByDay.set(k, 0);
  for (const e of enrollments) {
    const st = normalizeStatus(e.status);
    if (st !== 'completed' || !e.completedAt) continue;
    const key = e.completedAt.toISOString().slice(0, 10);
    if (completionsByDay.has(key)) {
      completionsByDay.set(key, (completionsByDay.get(key) ?? 0) + 1);
    }
  }
  const completionsLine = dayKeys.map((k) => ({
    date: k,
    completions: completionsByDay.get(k) ?? 0,
  }));

  const enrollmentCountsByCourse = new Map<string, { title: string; count: number }>();
  for (const e of enrollments) {
    const n = enrollmentCountsByCourse.get(e.courseId) ?? { title: e.course.title, count: 0 };
    n.count += 1;
    enrollmentCountsByCourse.set(e.courseId, n);
  }
  const enrollmentsPerCourse = Array.from(enrollmentCountsByCourse.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 16)
    .map((c) => ({
      name: c.title.length > 36 ? `${c.title.slice(0, 34)}…` : c.title,
      enrollments: c.count,
    }));

  const categoryCounts = new Map<string, number>();
  for (const c of catalogCourses) {
    if (c.categories.length === 0) {
      categoryCounts.set('Uncategorized', (categoryCounts.get('Uncategorized') ?? 0) + 1);
    } else {
      for (const cat of c.categories) {
        const k = cat.trim() || 'Uncategorized';
        categoryCounts.set(k, (categoryCounts.get(k) ?? 0) + 1);
      }
    }
  }
  const catalogCategoryPie =
    categoryCounts.size === 0
      ? [{ name: '—', value: 1 }]
      : Array.from(categoryCounts.entries())
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 12);

  // --- Per-user course progress ---
  const usersWithProgress: AdminUserProgress[] = users.map((u) => {
    const userEnrollments = userEnrollmentsByUserId.get(u.id) ?? [];

    const totalLessonsSum = userEnrollments.reduce((acc, e) => {
      const courseSlug = e.course.slug;
      const course = catalogBySlug.get(courseSlug);
      const totalLessons = course?.moduleCount ?? 0;
      return acc + totalLessons;
    }, 0);

    const completedLessonsSum = userEnrollments.reduce((acc, e) => {
      const courseId = e.courseId;
      const key = `${u.id}-${courseId}`;
      const completed = completedLessonCounts.get(key) ?? 0;
      const courseSlug = e.course.slug;
      const course = catalogBySlug.get(courseSlug);
      const totalLessons = course?.moduleCount ?? 0;
      return acc + clamp(completed, 0, totalLessons);
    }, 0);

    const overallCompletionPct = completionPct(completedLessonsSum, totalLessonsSum);

    const enrollmentsProgress: AdminCourseProgressForUser[] = userEnrollments.map((e) => {
      const courseSlug = e.course.slug;
      const course = catalogBySlug.get(courseSlug);
      const totalLessons = course?.moduleCount ?? 0;

      const key = `${u.id}-${e.courseId}`;
      const completedRaw = completedLessonCounts.get(key) ?? 0;
      const completedLessons = clamp(completedRaw, 0, totalLessons);

      const completedModules = completedLessons; // module ~= lesson in this catalog
      const remainingLessons = Math.max(0, totalLessons - completedModules);
      const pct = totalLessons > 0 ? Math.round((completedModules / totalLessons) * 100) : 0;

      return {
        enrollmentId: e.id,
        courseSlug,
        courseTitle: e.course.title,
        totalLessons,
        completedLessons,
        completionPct: pct,
        completedModules,
        remainingLessons,
        modules: course ? buildModuleProgress(course, completedModules) : [],
      };
    });

    return {
      userId: u.id,
      email: u.email,
      fullName: u.fullName ?? null,
      role: (u as any).role ?? null,
      isActive: u.isActive,
      createdAt: u.createdAt.toISOString(),
      lastActiveAt: lastActiveByUserId.get(u.id)?.toISOString() ?? null,
      overallCompletionPct,
      enrollments: enrollmentsProgress.sort((a, b) => b.completionPct - a.completionPct),
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    kpis: {
      totalUsers,
      activeLearners,
      totalEnrollments,
      completedEnrollments,
      completionRatePct,
    },
    charts: {
      statusPie,
      completionByCourseBar,
      completionsLine,
      enrollmentsPerCourse,
      catalogCategoryPie,
    },
    catalogMeta: {
      totalCoursesInCatalog: catalogCourses.length,
      excelPath: catalog.excelPath,
    },
    catalogCourses: catalogCourses
      .map((c) => ({ slug: c.slug, title: c.title, moduleCount: c.moduleCount }))
      .sort((a, b) => a.title.localeCompare(b.title)),
    users: usersWithProgress,
  };
}

