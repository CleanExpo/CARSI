import { NextRequest, NextResponse } from 'next/server';

import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { getOnboardingCourseBySlug } from '@/lib/server/onboarding-programs';
import { prisma } from '@/lib/prisma';
import { repairAndGetTeamForUser } from '@/lib/server/teams';

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  const { slug: rawSlug } = await ctx.params;
  const slug = rawSlug.trim().toLowerCase();
  const course = await getOnboardingCourseBySlug(slug);
  if (!course) {
    return NextResponse.json({ detail: 'Program not found' }, { status: 404 });
  }

  const team = await repairAndGetTeamForUser(claims.sub);
  const isOwner = team?.ownerId === claims.sub;

  type MemberUser = { id: string; email: string; fullName: string | null };
  let memberUsers: MemberUser[] = [];

  if (team) {
    const rows = await prisma.lmsTeamMember.findMany({
      where: { teamId: team.id },
      include: { user: { select: { id: true, email: true, fullName: true } } },
    });
    memberUsers = rows.map((r) => r.user);
    const owner = await prisma.lmsUser.findUnique({
      where: { id: team.ownerId },
      select: { id: true, email: true, fullName: true },
    });
    if (owner && !memberUsers.some((u) => u.id === owner.id)) {
      memberUsers.unshift(owner);
    }
  } else {
    const self = await prisma.lmsUser.findUnique({
      where: { id: claims.sub },
      select: { id: true, email: true, fullName: true },
    });
    if (self) memberUsers = [self];
  }

  const memberIds = memberUsers.map((u) => u.id);
  const enrollments = await prisma.lmsEnrollment.findMany({
    where: { courseId: course.id, studentId: { in: memberIds } },
  });
  const enrolledSet = new Set(enrollments.map((e) => e.studentId));

  const lessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
  const allProgress =
    lessonIds.length === 0
      ? []
      : await prisma.lmsLessonProgress.findMany({
          where: { studentId: { in: memberIds }, lessonId: { in: lessonIds }, completed: true },
          select: { studentId: true, lessonId: true },
        });

  const completedByUser = new Map<string, Set<string>>();
  for (const row of allProgress) {
    if (!completedByUser.has(row.studentId)) completedByUser.set(row.studentId, new Set());
    completedByUser.get(row.studentId)!.add(row.lessonId);
  }

  const totalLessons = lessonIds.length;

  const memberRows = memberUsers.map((user) => {
    const enrolled = enrolledSet.has(user.id);
    let progressPercent = 0;
    let completed = false;
    if (enrolled && totalLessons > 0) {
      const done = completedByUser.get(user.id)?.size ?? 0;
      progressPercent = Math.round((done / totalLessons) * 100);
      completed = done >= totalLessons;
    }
    return {
      userId: user.id,
      fullName: user.fullName,
      email: user.email,
      enrolled,
      progressPercent,
      completed,
    };
  });

  return NextResponse.json({
    programTitle: course.title,
    programSlug: slug,
    isOwner,
    members: memberRows,
  });
}
