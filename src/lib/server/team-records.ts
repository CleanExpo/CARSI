/**
 * Team training records — the per-company compliance artefact.
 *
 * A team owner (supervisor) can pull their whole team's course progress + completion:
 * who is enrolled, how far through, whether they've completed (the authoritative
 * `LmsEnrollment.status`, which already honours the quiz completion gate), and whether a
 * certificate has issued. This is the record a company relies on for insurer / WHS
 * due-diligence / school-childcare-aged-care contract compliance — the thing that makes the
 * subscription a must-have.
 *
 * DB-truth by design: lesson totals are counted from the live course structure (not the seed
 * catalog), so admin-managed courses report accurate completion. Reuses only the pure/DB
 * helpers from admin-user-progress; owner-gated at the route.
 */
import {
  completionPct,
  fetchCompletedLessonCounts,
  fetchLastActiveByUserId,
  normalizeEnrollmentStatus,
} from '@/lib/admin/admin-user-progress';
import { prisma } from '@/lib/prisma';
import { repairAndGetTeamForUser } from '@/lib/server/teams';

export type TeamMemberCourseRecord = {
  courseSlug: string;
  courseTitle: string;
  status: 'completed' | 'active' | 'other';
  completedLessons: number;
  totalLessons: number;
  completionPct: number;
  completedAt: string | null;
  certificateIssued: boolean;
};

export type TeamMemberRecord = {
  userId: string;
  fullName: string | null;
  email: string;
  role: string;
  lastActiveAt: string | null;
  courseCount: number;
  completedCourseCount: number;
  overallCompletionPct: number;
  courses: TeamMemberCourseRecord[];
};

export type TeamTrainingRecords = {
  teamId: string;
  teamName: string;
  memberCount: number;
  members: TeamMemberRecord[];
};

export type TeamRecordsResult = 'no_team' | 'forbidden' | TeamTrainingRecords;

/**
 * Build the training records for the team owned by `ownerUserId`. Returns `'no_team'` if the
 * user has no team, `'forbidden'` if they are not the team owner (records are the supervisor's
 * view), otherwise the records.
 */
export async function getTeamTrainingRecordsForOwner(
  ownerUserId: string
): Promise<TeamRecordsResult> {
  const team = await repairAndGetTeamForUser(ownerUserId);
  if (!team) return 'no_team';
  if (team.ownerId !== ownerUserId) return 'forbidden';

  const members = await prisma.lmsTeamMember.findMany({
    where: { teamId: team.id },
    include: { user: { select: { id: true, email: true, fullName: true } } },
  });
  const userIds = members.map((m) => m.userId);

  const enrollments = userIds.length
    ? await prisma.lmsEnrollment.findMany({
        where: { studentId: { in: userIds } },
        select: {
          studentId: true,
          courseId: true,
          status: true,
          completedAt: true,
          certificateIssuedAt: true,
          course: { select: { slug: true, title: true } },
        },
        orderBy: { enrolledAt: 'desc' },
      })
    : [];

  const courseIds = Array.from(new Set(enrollments.map((e) => e.courseId)));

  // DB-truth lesson totals per course (sum of module lesson counts).
  const moduleRows = courseIds.length
    ? await prisma.lmsModule.findMany({
        where: { courseId: { in: courseIds } },
        select: { courseId: true, _count: { select: { lessons: true } } },
      })
    : [];
  const totalLessonsByCourse = new Map<string, number>();
  for (const m of moduleRows) {
    totalLessonsByCourse.set(
      m.courseId,
      (totalLessonsByCourse.get(m.courseId) ?? 0) + m._count.lessons
    );
  }

  const completedByUserCourse = await fetchCompletedLessonCounts(userIds, courseIds);
  const lastActiveByUser = await fetchLastActiveByUserId(userIds);

  const memberRecords: TeamMemberRecord[] = members.map((m) => {
    const mine = enrollments.filter((e) => e.studentId === m.userId);
    const courses: TeamMemberCourseRecord[] = mine.map((e) => {
      const total = totalLessonsByCourse.get(e.courseId) ?? 0;
      const completed = completedByUserCourse.get(`${m.userId}-${e.courseId}`) ?? 0;
      const status = normalizeEnrollmentStatus(e.status);
      return {
        courseSlug: e.course.slug,
        courseTitle: e.course.title,
        status,
        completedLessons: completed,
        totalLessons: total,
        // A completed enrollment reads 100% even if lesson-progress rows lag.
        completionPct: status === 'completed' ? 100 : completionPct(completed, total),
        completedAt: e.completedAt ? e.completedAt.toISOString() : null,
        certificateIssued: e.certificateIssuedAt != null,
      };
    });
    const completedCourseCount = courses.filter((c) => c.status === 'completed').length;
    const overallCompletionPct = courses.length
      ? Math.round(courses.reduce((sum, c) => sum + c.completionPct, 0) / courses.length)
      : 0;
    const lastActive = lastActiveByUser.get(m.userId) ?? null;
    return {
      userId: m.userId,
      fullName: m.user?.fullName ?? null,
      email: m.user?.email ?? '',
      role: m.role,
      lastActiveAt: lastActive ? lastActive.toISOString() : null,
      courseCount: courses.length,
      completedCourseCount,
      overallCompletionPct,
      courses,
    };
  });

  // Owner/supervisor first, then by name for a stable, readable report.
  memberRecords.sort((a, b) => {
    if (a.role !== b.role) return a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : 0;
    return (a.fullName ?? a.email).localeCompare(b.fullName ?? b.email);
  });

  return {
    teamId: team.id,
    teamName: team.name,
    memberCount: members.length,
    members: memberRecords,
  };
}

function csvCell(value: string | number | null | undefined): string {
  const s = value == null ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Flatten the records to a CSV (one row per member×course) for the compliance export. */
export function teamRecordsToCsv(records: TeamTrainingRecords): string {
  const header = [
    'Team',
    'Member',
    'Email',
    'Role',
    'Course',
    'Status',
    'Completion %',
    'Completed lessons',
    'Total lessons',
    'Completed date',
    'Certificate issued',
    'Last active',
  ];
  const rows: string[] = [header.map(csvCell).join(',')];
  for (const m of records.members) {
    if (m.courses.length === 0) {
      rows.push(
        [records.teamName, m.fullName ?? '', m.email, m.role, '(no enrolments)', '', '', '', '', '', '', m.lastActiveAt ?? '']
          .map(csvCell)
          .join(',')
      );
      continue;
    }
    for (const c of m.courses) {
      rows.push(
        [
          records.teamName,
          m.fullName ?? '',
          m.email,
          m.role,
          c.courseTitle,
          c.status,
          c.completionPct,
          c.completedLessons,
          c.totalLessons,
          c.completedAt ?? '',
          c.certificateIssued ? 'yes' : 'no',
          m.lastActiveAt ?? '',
        ]
          .map(csvCell)
          .join(',')
      );
    }
  }
  return rows.join('\n');
}
