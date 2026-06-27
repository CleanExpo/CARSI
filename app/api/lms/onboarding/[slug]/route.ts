import { NextRequest, NextResponse } from 'next/server';

import {
  computeProgressFromModules,
  getPhasesForSlug,
  parseOnboardingMeta,
  type CurriculumModuleShape,
} from '@/lib/onboarding/enterprise';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { getOnboardingCourseBySlug } from '@/lib/server/onboarding-programs';
import { prisma } from '@/lib/prisma';

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

  const enrollment = await prisma.lmsEnrollment.findUnique({
    where: { studentId_courseId: { studentId: claims.sub, courseId: course.id } },
  });

  const lessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
  const progressRows =
    lessonIds.length === 0
      ? []
      : await prisma.lmsLessonProgress.findMany({
          where: { studentId: claims.sub, lessonId: { in: lessonIds } },
        });
  const progressByLesson = new Map(progressRows.map((p) => [p.lessonId, p]));

  const modules: CurriculumModuleShape[] = course.modules.map((mod) => ({
    id: mod.id,
    title: mod.title,
    order_index: mod.orderIndex,
    lessons: mod.lessons.map((les) => ({
      id: les.id,
      completed: progressByLesson.get(les.id)?.completed === true,
    })),
  }));

  const stats = computeProgressFromModules(modules);
  const meta = parseOnboardingMeta(course.meta);

  return NextResponse.json({
    program: {
      id: course.id,
      slug: course.slug,
      title: course.title,
      description: course.description,
      shortDescription: course.shortDescription,
      level: course.level,
      durationHours: course.durationHours != null ? Number(course.durationHours) : null,
      meta,
      enrolled: Boolean(enrollment),
      enrollmentId: enrollment?.id ?? null,
    },
    modules,
    phases: getPhasesForSlug(slug),
    progress: stats,
  });
}
