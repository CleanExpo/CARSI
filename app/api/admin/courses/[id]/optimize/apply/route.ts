import { NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import {
  applyOptimizedCourseDraft,
  draftFromApplyBody,
  OptimizeCourseError,
} from '@/lib/server/optimize-course-content';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  const session = await getAdminSessionOrNull();
  if (!session) return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const submitted = draftFromApplyBody(body);
  const token =
    (typeof (body as { token?: unknown } | null)?.token === 'string'
      ? String((body as { token: string }).token).trim()
      : '') ||
    submitted?.token ||
    '';
  if (!submitted && !token) {
    return NextResponse.json({ detail: 'Draft content is required' }, { status: 400 });
  }

  try {
    const course = await applyOptimizedCourseDraft(id, token, submitted);
    return NextResponse.json({ course });
  } catch (e) {
    if (e instanceof OptimizeCourseError) {
      return NextResponse.json({ detail: e.message }, { status: e.status });
    }
    console.error('[admin/courses optimize apply]', e);
    return NextResponse.json({ detail: 'Failed to apply optimised course' }, { status: 500 });
  }
}
