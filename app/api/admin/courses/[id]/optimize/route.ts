import { NextRequest, NextResponse } from 'next/server';

import { adminGetCourse } from '@/lib/admin/admin-courses-service';
import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { AnthropicAPIError } from '@/lib/server/anthropic-client';
import {
  discardOptimizeDraft,
  generateOptimizedCourseDraft,
  OptimizeCourseError,
  readOptimizeDraft,
} from '@/lib/server/optimize-course-content';

export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

function fail(e: unknown): NextResponse {
  if (e instanceof OptimizeCourseError) {
    return NextResponse.json({ detail: e.message }, { status: e.status });
  }
  if (e instanceof AnthropicAPIError) {
    return NextResponse.json({ detail: e.message }, { status: e.statusCode });
  }
  console.error('[admin/courses optimize]', e);
  return NextResponse.json({ detail: 'Failed to generate preview' }, { status: 500 });
}

export async function GET(_request: NextRequest, ctx: Ctx) {
  const session = await getAdminSessionOrNull();
  if (!session) return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  const { id } = await ctx.params;
  const course = await adminGetCourse(id);
  if (!course) return NextResponse.json({ detail: 'Not found' }, { status: 404 });
  return NextResponse.json({
    courseTitle: course.title,
    draft: readOptimizeDraft(course.meta),
  });
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const session = await getAdminSessionOrNull();
  if (!session) return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });

  const { id } = await ctx.params;
  const course = await adminGetCourse(id);
  if (!course) return NextResponse.json({ detail: 'Not found' }, { status: 404 });
  await discardOptimizeDraft(id, course.meta);
  return NextResponse.json({ ok: true });
}

export async function POST(_request: NextRequest, ctx: Ctx) {
  const session = await getAdminSessionOrNull();
  if (!session) return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  const { id } = await ctx.params;
  try {
    const draft = await generateOptimizedCourseDraft(id);
    return NextResponse.json({ draft });
  } catch (e) {
    return fail(e);
  }
}
