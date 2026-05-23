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
  status: string;
  enrolledAt: string;
  completedAt: string | null;
  paymentReference: string | null;
  cecHours: number | null;
  discipline: string | null;
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
  isVerified: boolean;
  iicrcMemberNumber: string | null;
  iicrcExpiryDate: string | null;
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string | null;
  overallCompletionPct: number;
  enrollments: AdminCourseProgressForUser[];
};

export type AdminCatalogCourseOption = {
  slug: string;
  title: string;
  moduleCount: number;
};

export type AdminCatalogContext = {
  catalogBySlug: Map<string, AdminCatalogCourse>;
  catalogSlugs: string[];
  catalogCourses: AdminCatalogCourseOption[];
  catalogMeta: { totalCoursesInCatalog: number; excelPath: string };
};

export function normalizeEnrollmentStatus(status: string): 'completed' | 'active' | 'other' {
  const s = (status ?? '').toLowerCase().trim();
  if (s === 'completed' || s === 'complete') return 'completed';
  if (['active', 'enrolled', 'in_progress', 'in progress', 'started'].includes(s)) return 'active';
  return 'other';
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function completionPct(completed: number, total: number) {
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

export function getAdminCatalogContext(): AdminCatalogContext {
  const catalog = buildAdminCatalogFromSeed();
  const catalogCourses = catalog.courses;
  const catalogBySlug = new Map(catalogCourses.map((c) => [c.slug, c]));
  return {
    catalogBySlug,
    catalogSlugs: Array.from(catalogBySlug.keys()),
    catalogCourses: catalogCourses
      .map((c) => ({ slug: c.slug, title: c.title, moduleCount: c.moduleCount }))
      .sort((a, b) => a.title.localeCompare(b.title)),
    catalogMeta: {
      totalCoursesInCatalog: catalogCourses.length,
      excelPath: catalog.excelPath,
    },
  };
}

type EnrollmentRow = {
  id: string;
  studentId: string;
  courseId: string;
  status: string;
  paymentReference: string | null;
  enrolledAt: Date;
  completedAt: Date | null;
  course: { id: string; slug: string; title: string; iicrcDiscipline: string | null; cecHours: number | null };
};

type UserRow = {
  id: string;
  email: string;
  fullName: string | null;
  role: string | null;
  isActive: boolean;
  isVerified: boolean;
  iicrcMemberNumber: string | null;
  iicrcExpiryDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export function mapUserToAdminProgress(
  user: UserRow,
  userEnrollments: EnrollmentRow[],
  catalogBySlug: Map<string, AdminCatalogCourse>,
  completedLessonCounts: Map<string, number>,
  lastActiveAt: Date | null,
): AdminUserProgress {
  const totalLessonsSum = userEnrollments.reduce((acc, e) => {
    const course = catalogBySlug.get(e.course.slug);
    return acc + (course?.moduleCount ?? 0);
  }, 0);

  const completedLessonsSum = userEnrollments.reduce((acc, e) => {
    const key = `${user.id}-${e.courseId}`;
    const completed = completedLessonCounts.get(key) ?? 0;
    const course = catalogBySlug.get(e.course.slug);
    const totalLessons = course?.moduleCount ?? 0;
    return acc + clamp(completed, 0, totalLessons);
  }, 0);

  const overallCompletionPct = completionPct(completedLessonsSum, totalLessonsSum);

  const enrollmentsProgress: AdminCourseProgressForUser[] = userEnrollments.map((e) => {
    const courseSlug = e.course.slug;
    const course = catalogBySlug.get(courseSlug);
    const totalLessons = course?.moduleCount ?? 0;
    const key = `${user.id}-${e.courseId}`;
    const completedRaw = completedLessonCounts.get(key) ?? 0;
    const completedLessons = clamp(completedRaw, 0, totalLessons);
    const completedModules = completedLessons;
    const remainingLessons = Math.max(0, totalLessons - completedModules);
    const pct = totalLessons > 0 ? Math.round((completedModules / totalLessons) * 100) : 0;

    return {
      enrollmentId: e.id,
      courseSlug,
      courseTitle: e.course.title,
      status: e.status,
      enrolledAt: e.enrolledAt.toISOString(),
      completedAt: e.completedAt?.toISOString() ?? null,
      paymentReference: e.paymentReference,
      cecHours: e.course.cecHours,
      discipline: e.course.iicrcDiscipline,
      totalLessons,
      completedLessons,
      completionPct: pct,
      completedModules,
      remainingLessons,
      modules: course ? buildModuleProgress(course, completedModules) : [],
    };
  });

  return {
    userId: user.id,
    email: user.email,
    fullName: user.fullName ?? null,
    role: user.role ?? null,
    isActive: user.isActive,
    isVerified: user.isVerified,
    iicrcMemberNumber: user.iicrcMemberNumber,
    iicrcExpiryDate: user.iicrcExpiryDate?.toISOString().slice(0, 10) ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    lastActiveAt: lastActiveAt?.toISOString() ?? null,
    overallCompletionPct,
    enrollments: enrollmentsProgress.sort((a, b) => b.completionPct - a.completionPct),
  };
}

const enrollmentSelect = {
  id: true,
  studentId: true,
  courseId: true,
  status: true,
  paymentReference: true,
  enrolledAt: true,
  completedAt: true,
  course: {
    select: {
      id: true,
      slug: true,
      title: true,
      iicrcDiscipline: true,
      cecHours: true,
    },
  },
} as const;

const userSelect = {
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
} as const;

export async function fetchCompletedLessonCounts(
  userIds: string[],
  courseIds: string[],
): Promise<Map<string, number>> {
  const completedLessonCounts = new Map<string, number>();
  if (userIds.length === 0 || courseIds.length === 0) return completedLessonCounts;

  const completedRows = await prisma.lmsLessonProgress.findMany({
    where: {
      studentId: { in: userIds },
      completed: true,
      lesson: { module: { courseId: { in: courseIds } } },
    },
    select: {
      studentId: true,
      lesson: { select: { module: { select: { courseId: true } } } },
    },
  });

  for (const row of completedRows) {
    const courseId = row.lesson?.module?.courseId;
    if (!courseId) continue;
    const key = `${row.studentId}-${courseId}`;
    completedLessonCounts.set(key, (completedLessonCounts.get(key) ?? 0) + 1);
  }
  return completedLessonCounts;
}

export async function fetchLastActiveByUserId(userIds: string[]): Promise<Map<string, Date | null>> {
  const lastActiveByUserId = new Map<string, Date | null>();
  if (userIds.length === 0) return lastActiveByUserId;

  const lastActiveRows = await prisma.lmsLessonProgress.groupBy({
    by: ['studentId'],
    where: { studentId: { in: userIds } },
    _max: { lastAccessedAt: true },
  });

  for (const r of lastActiveRows) {
    lastActiveByUserId.set(r.studentId, r._max.lastAccessedAt ?? null);
  }
  return lastActiveByUserId;
}

export async function fetchCatalogEnrollmentsForUsers(
  userIds: string[],
  catalogSlugs: string[],
): Promise<EnrollmentRow[]> {
  if (userIds.length === 0) return [];
  return prisma.lmsEnrollment.findMany({
    where: {
      studentId: { in: userIds },
      course: { slug: { in: catalogSlugs } },
    },
    select: enrollmentSelect,
  }) as Promise<EnrollmentRow[]>;
}

export async function getAdminUserDetail(userId: string): Promise<{
  user: AdminUserProgress;
  roleNames: string[];
  catalogCourses: AdminCatalogCourseOption[];
} | null> {
  const ctx = getAdminCatalogContext();
  const user = await prisma.lmsUser.findUnique({
    where: { id: userId },
    select: {
      ...userSelect,
      userRoles: { select: { role: { select: { name: true } } } },
    },
  });
  if (!user) return null;

  const enrollments = await fetchCatalogEnrollmentsForUsers([userId], ctx.catalogSlugs);
  const courseIds = Array.from(new Set(enrollments.map((e) => e.courseId)));
  const completedLessonCounts = await fetchCompletedLessonCounts([userId], courseIds);
  const lastActiveMap = await fetchLastActiveByUserId([userId]);
  const roleNames = user.userRoles.map((ur) => ur.role.name);

  const progress = mapUserToAdminProgress(
    user,
    enrollments,
    ctx.catalogBySlug,
    completedLessonCounts,
    lastActiveMap.get(userId) ?? null,
  );

  return {
    user: progress,
    roleNames,
    catalogCourses: ctx.catalogCourses,
  };
}
