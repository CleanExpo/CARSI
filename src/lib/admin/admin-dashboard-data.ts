import { prisma } from '@/lib/prisma';

import { loadAdminCatalogSource } from '@/lib/admin/admin-catalog-source';
import { summariseOpsPeriod, type AdminOpsPeriodKpis } from '@/lib/admin/admin-ops-metrics';
import {
  enrollmentLooksPaid,
  fetchCompletedLessonCounts,
  fetchEnrollmentsForUsers,
  fetchLastActiveByUserId,
  listPriceAudFromCourse,
  mapUserToAdminProgress,
  normalizeEnrollmentStatus,
  type AdminCatalogCourseOption,
  type AdminUserProgress,
} from '@/lib/admin/admin-user-progress';
import { resolveLmsCourseCecHours } from '@/lib/server/course-cec-hours';

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
    inProgressEnrollments: number;
    neverStartedEnrollments: number;
    certificatesIssued: number;
    cecCompletions: number;
    refundedEnrollments: number;
  };
  ops: {
    revenueNote: string;
    allTime: AdminOpsPeriodKpis;
    thisMonth: AdminOpsPeriodKpis;
    lastMonth: AdminOpsPeriodKpis;
    thisYear: AdminOpsPeriodKpis;
    monthly: { month: string; revenueAud: number; enrollments: number; completions: number }[];
    topByRevenue: { title: string; revenueAud: number; enrollments: number }[];
    attention: {
      neverStarted: { userId: string; name: string; email: string; courseTitle: string }[];
      refunds: {
        userId: string;
        name: string;
        email: string;
        courseTitle: string;
        reason: string;
      }[];
      recentCompletions: { userId: string; name: string; courseTitle: string; at: string }[];
    };
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
  users: AdminDashboardUserEntry[];
};

// The overview users table renders only the flat summary fields; the heavy
// per-enrollment `modules` tree (AdminCourseProgressForUser[]) is unused here
// and is shown on the /admin/users/[userId] detail page instead. Omitting it
// keeps the serialized dashboard payload small (it was ~700KB of dead weight).
export type AdminDashboardUserEntry = Omit<AdminUserProgress, 'enrollments'>;

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
    (e) => normalizeEnrollmentStatus(e.status) === 'completed'
  ).length;
  const activeEnrollmentRows = enrollments.filter(
    (e) => normalizeEnrollmentStatus(e.status) === 'active'
  );
  const activeLearners = new Set(activeEnrollmentRows.map((e) => e.studentId)).size;
  let neverStartedEnrollments = 0;
  let inProgressEnrollments = 0;
  for (const e of activeEnrollmentRows) {
    const done = completedLessonCounts.get(`${e.studentId}-${e.courseId}`) ?? 0;
    if (done <= 0) neverStartedEnrollments += 1;
    else inProgressEnrollments += 1;
  }
  const certificatesIssued = enrollments.filter((e) => e.certificateIssuedAt).length;
  const refundedEnrollments = enrollments.filter((e) => {
    const s = (e.status ?? '').toLowerCase();
    return s === 'refunded' || s === 'revoked';
  }).length;
  const cecCompletions = enrollments.filter(
    (e) =>
      normalizeEnrollmentStatus(e.status) === 'completed' &&
      (resolveLmsCourseCecHours({ slug: e.course.slug }) ?? 0) > 0
  ).length;

  const completionRatePct =
    totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0;

  const statusPie = [
    { name: 'Active', value: activeEnrollmentRows.length },
    { name: 'Completed', value: completedEnrollments },
  ];

  const enrollmentsByCourseId = new Map<
    string,
    { total: number; completed: number; title: string }
  >();
  for (const e of enrollments) {
    const n = enrollmentsByCourseId.get(e.courseId) ?? {
      total: 0,
      completed: 0,
      title: e.course.title,
    };
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
        lastActiveByUserId.get(u.id) ?? null
      )
    )
    .sort((a, b) => {
      const aTime = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0;
      const bTime = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0;
      if (bTime !== aTime) return bTime - aTime;
      return (a.fullName ?? a.email).localeCompare(b.fullName ?? b.email);
    });

  const userById = new Map(usersWithProgress.map((u) => [u.userId, u]));
  const now = new Date();
  const saleRows = enrollments.map((e) => ({
    enrolledAt: e.enrolledAt,
    completedAt: e.completedAt,
    certificateIssuedAt: e.certificateIssuedAt,
    status: e.status,
    paymentReference: e.paymentReference,
    course: e.course,
  }));
  const createdAts = users.map((u) => u.createdAt);

  const revenueByCourse = new Map<
    string,
    { title: string; revenueAud: number; enrollments: number }
  >();
  for (const e of enrollments) {
    if (!enrollmentLooksPaid(e)) continue;
    const row = revenueByCourse.get(e.courseId) ?? {
      title: e.course.title,
      revenueAud: 0,
      enrollments: 0,
    };
    row.revenueAud += listPriceAudFromCourse(e.course);
    row.enrollments += 1;
    revenueByCourse.set(e.courseId, row);
  }
  const topByRevenue = Array.from(revenueByCourse.values())
    .sort((a, b) => b.revenueAud - a.revenueAud)
    .slice(0, 8)
    .map((r) => ({ ...r, revenueAud: Math.round(r.revenueAud * 100) / 100 }));

  const monthly: { month: string; revenueAud: number; enrollments: number; completions: number }[] =
    [];
  for (let i = 7; i >= 0; i -= 1) {
    const cursor = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
    let revenueAud = 0;
    let monthEnrollments = 0;
    let monthCompletions = 0;
    for (const e of enrollments) {
      if (e.enrolledAt >= cursor && e.enrolledAt < next) {
        monthEnrollments += 1;
        if (enrollmentLooksPaid(e)) revenueAud += listPriceAudFromCourse(e.course);
      }
      if (e.completedAt && e.completedAt >= cursor && e.completedAt < next) {
        monthCompletions += 1;
      }
    }
    monthly.push({
      month: key,
      revenueAud: Math.round(revenueAud * 100) / 100,
      enrollments: monthEnrollments,
      completions: monthCompletions,
    });
  }

  const neverStarted: { userId: string; name: string; email: string; courseTitle: string }[] = [];
  const refunds: {
    userId: string;
    name: string;
    email: string;
    courseTitle: string;
    reason: string;
  }[] = [];
  const recentCompletions: { userId: string; name: string; courseTitle: string; at: string }[] = [];
  for (const e of enrollments) {
    const owner = userById.get(e.studentId);
    const name = owner?.fullName ?? owner?.email ?? e.studentId;
    const email = owner?.email ?? '';
    const status = normalizeEnrollmentStatus(e.status);
    const done = completedLessonCounts.get(`${e.studentId}-${e.courseId}`) ?? 0;
    if (status === 'active' && done <= 0 && neverStarted.length < 8) {
      neverStarted.push({ userId: e.studentId, name, email, courseTitle: e.course.title });
    }
    const raw = (e.status ?? '').toLowerCase();
    if ((raw === 'refunded' || raw === 'revoked') && refunds.length < 8) {
      refunds.push({
        userId: e.studentId,
        name,
        email,
        courseTitle: e.course.title,
        reason: raw,
      });
    }
    if (e.completedAt) {
      recentCompletions.push({
        userId: e.studentId,
        name,
        courseTitle: e.course.title,
        at: e.completedAt.toISOString(),
      });
    }
  }
  recentCompletions.sort((a, b) => (a.at < b.at ? 1 : -1));

  return {
    generatedAt: new Date().toISOString(),
    kpis: {
      totalUsers,
      activeLearners,
      totalEnrollments,
      completedEnrollments,
      completionRatePct,
      inProgressEnrollments,
      neverStartedEnrollments,
      certificatesIssued,
      cecCompletions,
      refundedEnrollments,
    },
    ops: {
      revenueNote:
        'Recognised catalogue AUD on paid enrolments (payment reference present, not refunded). Not a Stripe payout ledger.',
      allTime: summariseOpsPeriod(saleRows, createdAts, 'all', now),
      thisMonth: summariseOpsPeriod(saleRows, createdAts, 'this_month', now),
      lastMonth: summariseOpsPeriod(saleRows, createdAts, 'last_month', now),
      thisYear: summariseOpsPeriod(saleRows, createdAts, 'this_year', now),
      monthly,
      topByRevenue,
      attention: {
        neverStarted,
        refunds,
        recentCompletions: recentCompletions.slice(0, 8),
      },
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
    // Strip the unused per-enrollment `modules` detail before serializing to the
    // client — the overview table needs only the flat summary fields.
    users: usersWithProgress.map(({ enrollments: _enrollments, ...summary }) => summary),
  };
}
