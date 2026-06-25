import { prisma } from '@/lib/prisma';

import { loadAdminCatalogSource } from '@/lib/admin/admin-catalog-source';
import {
  fetchEnrollmentsForUsers,
  fetchCompletedLessonCounts,
  fetchLastActiveByUserId,
  mapUserToAdminProgress,
  normalizeEnrollmentStatus,
  type AdminCatalogCourseOption,
  type AdminUserProgress,
} from '@/lib/admin/admin-user-progress';

export type {
  AdminCourseModuleProgress,
  AdminCourseProgressForUser,
  AdminUserProgress,
} from '@/lib/admin/admin-user-progress';

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
    catalogSource: 'database' | 'workbook' | 'seed';
  };
  catalogCourses: AdminCatalogCourseOption[];
  users: AdminUserProgress[];
};

export async function getAdminDashboardData(): Promise<AdminDashboardClientData> {
  const catalog = await loadAdminCatalogSource();
  const catalogCourses = catalog.catalogCourses;
  const catalogBySlug = catalog.catalogBySlug;

  const users = await prisma.lmsUser.findMany({
    // Defensive cap so the admin dashboard can't load an unbounded user set
    // into memory. Generous for current scale; switch to pagination if exceeded.
    take: 2000,
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isActive: true,
      isVerified: true,
      iicrcMemberNumber: true,
      iicrcExpiryDate: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [{ createdAt: 'desc' }],
  });

  const userIds = users.map((u) => u.id);
  const enrollments = await fetchEnrollmentsForUsers(userIds);
  const courseIds = Array.from(new Set(enrollments.map((e) => e.courseId)));
  const completedLessonCounts = await fetchCompletedLessonCounts(userIds, courseIds);
  const lastActiveByUserId = await fetchLastActiveByUserId(userIds);

  const userEnrollmentsByUserId = new Map<string, typeof enrollments>();
  for (const e of enrollments) {
    const arr = userEnrollmentsByUserId.get(e.studentId) ?? [];
    arr.push(e);
    userEnrollmentsByUserId.set(e.studentId, arr);
  }

  const totalUsers = users.length;
  const totalEnrollments = enrollments.length;
  const completedEnrollments = enrollments.filter(
    (e) => normalizeEnrollmentStatus(e.status) === 'completed',
  ).length;
  const activeLearners = enrollments.filter(
    (e) => normalizeEnrollmentStatus(e.status) === 'active',
  ).length;

  const completionRatePct =
    totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0;

  const statusPie = [
    { name: 'Active', value: activeLearners },
    { name: 'Completed', value: completedEnrollments },
  ];

  const enrollmentsByCourseId = new Map<string, { total: number; completed: number; title: string }>();
  for (const e of enrollments) {
    const n = enrollmentsByCourseId.get(e.courseId) ?? { total: 0, completed: 0, title: e.course.title };
    n.total += 1;
    if (normalizeEnrollmentStatus(e.status) === 'completed') n.completed += 1;
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
    dayKeys.push(d.toISOString().slice(0, 10));
  }
  const completionsByDay = new Map<string, number>();
  for (const k of dayKeys) completionsByDay.set(k, 0);
  for (const e of enrollments) {
    if (normalizeEnrollmentStatus(e.status) !== 'completed' || !e.completedAt) continue;
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
  for (const c of catalogBySlug.values()) {
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

  const usersWithProgress: AdminUserProgress[] = users
    .map((u) =>
      mapUserToAdminProgress(
        u,
        userEnrollmentsByUserId.get(u.id) ?? [],
        catalogBySlug,
        completedLessonCounts,
        lastActiveByUserId.get(u.id) ?? null,
      ),
    )
    .sort((a, b) => {
      const aTime = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0;
      const bTime = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0;
      if (bTime !== aTime) return bTime - aTime;
      return (a.fullName ?? a.email).localeCompare(b.fullName ?? b.email);
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
      totalCoursesInCatalog: catalog.courses.length,
      excelPath: catalog.source === 'database' ? 'LMS database' : 'Workbook / seed',
      catalogSource: catalog.source,
    },
    catalogCourses,
    users: usersWithProgress,
  };
}
