import { type NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { resolveCurrentReviewManager } from '@/lib/server/current-admin';
import {
  getCourseIdBySlug,
  getReviewTextForCourse,
  getReviewVisibility,
} from '@/lib/server/course-reviews';
import { mayReplyToReview, reviewPrincipal } from '@/lib/server/review-access-rules';
import { readReviewAdminSession } from '@/lib/server/review-admin-session';
import { draftReviewReply } from '@/lib/server/review-reply-draft';

/**
 * POST /api/lms/courses/:slug/reviews/:id/reply/draft — AI-suggest an instructor reply
 * (GP-118). Returns { draft: string | null }; null when the model is unconfigured or errors, so
 * the UI falls back to writing manually.
 *
 * The review's text is sent to a third-party model, so this is a private read (release-gate r11).
 * Who may draft is decided from the DATABASE, never the token's role: a current admin
 * (resolveCurrentAdmin) or a current instructor, re-checked in a transaction that then reads the
 * review. An instructor cannot read hidden reviews, so a hidden review is refused outright for
 * them and its text never reaches the model; nothing is read or sent on any refusal.
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string; id: string }> }
) {
  const session = await readReviewAdminSession(request);
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  const { slug, id } = await ctx.params;

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ draft: null });
  }

  try {
    const course = await getCourseIdBySlug(slug);
    if (!course) {
      return NextResponse.json({ detail: 'Course not found' }, { status: 404 });
    }
    const access = await prisma.$transaction(async (tx) => {
      const manager = await resolveCurrentReviewManager(tx, session);
      if (!manager) return { kind: 'forbidden' as const };
      // Visibility first (no private field), against the rule table; the text only if allowed.
      const principal = reviewPrincipal(manager);
      const target = await getReviewVisibility(id, course.id, tx);
      if (!target) return { kind: 'missing' as const };
      if (!mayReplyToReview(principal, target.isPublished)) return { kind: 'hidden' as const };
      // The text read carries the visibility rule itself (r13): if the review was hidden after the
      // check above, an instructor's read returns nothing and the draft is refused — never sent.
      const review = await getReviewTextForCourse(id, course.id, principal, tx);
      if (!review) return { kind: 'hidden' as const };
      return { kind: 'ok' as const, review };
    });
    if (access.kind === 'forbidden') {
      return NextResponse.json(
        { detail: 'Only instructors or admins can draft replies' },
        { status: 403 }
      );
    }
    if (access.kind === 'hidden') {
      return NextResponse.json(
        { detail: 'Hidden reviews cannot be drafted by instructors' },
        { status: 403 }
      );
    }
    if (access.kind === 'missing') {
      return NextResponse.json({ detail: 'Review not found' }, { status: 404 });
    }
    const draft = await draftReviewReply({
      courseTitle: course.title,
      rating: access.review.rating,
      title: access.review.title,
      body: access.review.body,
    });
    return NextResponse.json({ draft });
  } catch (e) {
    console.error('[courses/:slug/reviews/:id/reply/draft POST]', e);
    return NextResponse.json({ detail: 'Failed to draft reply' }, { status: 500 });
  }
}
