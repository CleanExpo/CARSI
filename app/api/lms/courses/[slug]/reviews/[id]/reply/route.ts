import { type NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { NotCurrentReviewManagerError, resolveCurrentReviewManager } from '@/lib/server/current-admin';
import { databaseUnavailableResponse, isDatabaseConfigured } from '@/lib/server/database-unavailable';
import { getCourseIdBySlug, getReviewForCourse, setReviewReply } from '@/lib/server/course-reviews';
import { readReviewAdminSession } from '@/lib/server/review-admin-session';

/**
 * POST /api/lms/courses/:slug/reviews/:id/reply — publish (or clear) an instructor/admin
 * response to a review (GP-118). Body: { reply: string | null }. Clearing = empty/null reply.
 * Who may reply is decided from the DATABASE, never the token's role (release-gate r10): a current
 * admin (resolveCurrentAdmin) or a current instructor, re-checked in the same transaction as the write.
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string; id: string }> }
) {
  const session = await readReviewAdminSession(request);
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }
  const forbidden = () => NextResponse.json({ detail: 'Only instructors or admins can reply' }, { status: 403 });

  const { slug, id } = await ctx.params;

  let payload: { reply?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON body' }, { status: 400 });
  }
  if (payload.reply != null && typeof payload.reply !== 'string') {
    return NextResponse.json({ detail: 'reply must be a string or null' }, { status: 400 });
  }
  const reply = (payload.reply as string | null) ?? null;

  if (!isDatabaseConfigured()) return databaseUnavailableResponse('Replies are temporarily unavailable.');

  try {
    if (!(await resolveCurrentReviewManager(prisma, session))) return forbidden();
    const course = await getCourseIdBySlug(slug);
    if (!course) {
      return NextResponse.json({ detail: 'Course not found' }, { status: 404 });
    }
    const review = await getReviewForCourse(id, course.id);
    if (!review) {
      return NextResponse.json({ detail: 'Review not found' }, { status: 404 });
    }
    await setReviewReply({ reviewId: id, reply, session });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof NotCurrentReviewManagerError) return forbidden();
    console.error('[courses/:slug/reviews/:id/reply POST]', e);
    return NextResponse.json({ detail: 'Failed to save reply' }, { status: 500 });
  }
}
