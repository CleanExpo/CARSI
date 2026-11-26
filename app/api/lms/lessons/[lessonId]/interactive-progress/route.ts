import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { isLmsClaimsAllowedAdminPanel } from '@/lib/admin/admin-panel-access';
import { getInteractiveExperienceById } from '@/lib/lms/interactive-experience-registry';
import {
  normalizeInteractiveProgress,
  type InteractiveProgressSnapshot,
} from '@/lib/lms/interactive-progress';
import { lessonAllowsInteractiveExperience } from '@/lib/lms/lesson-interactive-resources';
import { prisma } from '@/lib/prisma';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import {
  findEnrolledCoursePrerequisiteBlock,
  prerequisiteBlockBody,
} from '@/lib/server/course-prerequisites';
import { EnrollmentLockRefusal } from '@/lib/server/enrollment-row-lock';
import {
  ensureStaffEnrollmentForLesson,
  getLessonContextForStudent,
} from '@/lib/server/enrollment-service';
import {
  readLessonInteractiveProgress,
  writeLessonInteractiveProgress,
} from '@/lib/server/lesson-interactive-progress';
import { getUpstreamBaseUrl } from '@/lib/server/upstream-api';

type Ctx = { params: Promise<{ lessonId: string }> };

const putBodySchema = z.object({
  experienceId: z.string().min(1).max(120),
  snapshot: z.object({
    activityIndex: z.number().int().min(0),
    completedActivityIds: z.array(z.string().min(1).max(120)),
    earnedXp: z.number().int().min(0),
  }),
});

function normalizeBodySnapshot(
  experienceId: string,
  snapshot: InteractiveProgressSnapshot
): InteractiveProgressSnapshot {
  const experience = getInteractiveExperienceById(experienceId);
  if (!experience) {
    throw new Error('Unknown interactive experience');
  }
  return normalizeInteractiveProgress(experience, snapshot);
}

export async function GET(request: NextRequest, ctx: Ctx) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  const { lessonId } = await ctx.params;

  await ensureStaffEnrollmentForLesson(claims, lessonId);

  const ctxRow = await getLessonContextForStudent(lessonId, claims.sub);
  if (!ctxRow) {
    return NextResponse.json({ detail: 'Lesson not found or access denied' }, { status: 404 });
  }

  const prereqBlock = await findEnrolledCoursePrerequisiteBlock({
    userId: claims.sub,
    isAdmin: () => isLmsClaimsAllowedAdminPanel(claims),
    courseId: ctxRow.lesson.module.courseId,
  });
  if (prereqBlock) {
    return NextResponse.json(prerequisiteBlockBody(prereqBlock), { status: 403 });
  }

  const byExperience = await readLessonInteractiveProgress(prisma, claims.sub, lessonId);
  return NextResponse.json({ byExperience }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(request: NextRequest, ctx: Ctx) {
  const upstream = getUpstreamBaseUrl();
  if (upstream) {
    return NextResponse.json({ detail: 'Interactive progress unavailable' }, { status: 503 });
  }

  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  const parsed = putBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ detail: 'Invalid interactive progress payload' }, { status: 400 });
  }

  const { lessonId } = await ctx.params;

  await ensureStaffEnrollmentForLesson(claims, lessonId);

  const ctxRow = await getLessonContextForStudent(lessonId, claims.sub);
  if (!ctxRow) {
    return NextResponse.json({ detail: 'Lesson not found or access denied' }, { status: 404 });
  }

  const prereqBlock = await findEnrolledCoursePrerequisiteBlock({
    userId: claims.sub,
    isAdmin: () => isLmsClaimsAllowedAdminPanel(claims),
    courseId: ctxRow.lesson.module.courseId,
  });
  if (prereqBlock) {
    return NextResponse.json(prerequisiteBlockBody(prereqBlock), { status: 403 });
  }

  const courseSlug = ctxRow.lesson.module.course.slug;
  if (
    !lessonAllowsInteractiveExperience(
      courseSlug,
      lessonId,
      ctxRow.lesson.resources,
      parsed.data.experienceId
    )
  ) {
    return NextResponse.json(
      { detail: 'Experience not available on this lesson' },
      { status: 403 }
    );
  }

  let snapshot: InteractiveProgressSnapshot;
  try {
    snapshot = normalizeBodySnapshot(parsed.data.experienceId, parsed.data.snapshot);
  } catch {
    return NextResponse.json({ detail: 'Unknown interactive experience' }, { status: 400 });
  }

  try {
    const byExperience = await writeLessonInteractiveProgress({
      studentId: claims.sub,
      lessonId,
      enrollmentId: ctxRow.enrollmentId,
      experienceId: parsed.data.experienceId,
      snapshot,
    });
    return NextResponse.json(
      { ok: true, byExperience },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e) {
    if (e instanceof EnrollmentLockRefusal) {
      return NextResponse.json({ detail: 'Lesson not found or access denied' }, { status: 403 });
    }
    throw e;
  }
}
