/**
 * POST /api/lms/subscription/teams/enroll — enrol a SEATED team member in a
 * published course at no extra charge (WS1-E2, GP-442). Body: { slug }
 *
 * This is the server-side ENTITLEMENT GATE for Teams seat-based enrolment. It
 * FAILS CLOSED at every step:
 *  - flag off                      → 503
 *  - not signed in                 → 401, no content
 *  - no entitled seat (lapsed/full)→ 403 with a hint, NO course payload
 *
 * A seat entitles the WHOLE published catalogue (like the individual
 * membership). Seat exhaustion beyond the paid limit → not entitled (the owner
 * must expand seats). Lapse gates NEW enrolments only; nothing here revokes an
 * existing enrolment, progress, or an issued certificate.
 *
 * Prerequisites (DECISIONS #53, founder 03/11/2026): a member who has not completed a
 * course's prerequisite is issued a LOCKED seat (`prerequisite_gated`), the same as a bought
 * team seat (#49) — not refused. The response then reports `locked: true` with the
 * prerequisite links (the shape of GET /api/lms/courses/[slug]/prerequisites) and points
 * `learn_url` at the course page, where PrerequisiteLockNotice shows "Complete … first".
 * Fail-closed: a prerequisite lookup error during enrolment throws (500, no seat issued),
 * and an error while reading the lock state back reports the seat as locked.
 */

import { NextRequest, NextResponse } from 'next/server';

import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { notifyCrmEnrollmentCreated } from '@/lib/server/crm-enrollment-notify';
import { sendEnrollmentWelcomeEmail } from '@/lib/server/enrollment-email';
import { enrollStudentInCourse } from '@/lib/server/enrollment-service';
import { isLmsClaimsAllowedAdminPanel } from '@/lib/admin/admin-panel-access';
import type { SessionClaims } from '@/lib/auth/session-jwt';
import { prisma } from '@/lib/prisma';
import {
  findEnrolledCoursePrerequisiteBlock,
  isPrerequisiteNotMetError,
  prerequisiteBlockBody,
  type PrerequisiteBlock,
} from '@/lib/server/course-prerequisites';
import { getTeamEntitlements } from '@/lib/server/entitlements';
import { getFirstLessonLearnPath } from '@/lib/server/first-lesson';
import { getPublishedCourseForCheckout } from '@/lib/server/public-courses-list';
import { teamSubscriptionsEnabled } from '@/lib/server/subscriptions-flag';

/**
 * The seat's prerequisite lock as the lesson routes will see it. Fails CLOSED: an error
 * reports the seat locked (the lesson/quiz read gates remain the real enforcement).
 */
async function readSeatLock(
  claims: SessionClaims,
  slug: string,
  courseId: string | null
): Promise<{ locked: boolean; block: PrerequisiteBlock | null }> {
  try {
    const id =
      courseId ??
      (await prisma.lmsCourse.findUnique({ where: { slug }, select: { id: true } }))?.id ??
      null;
    if (!id) return { locked: true, block: null };
    const block = await findEnrolledCoursePrerequisiteBlock({
      userId: claims.sub,
      isAdmin: () => isLmsClaimsAllowedAdminPanel(claims),
      courseId: id,
    });
    return { locked: Boolean(block), block };
  } catch (e) {
    console.error('[subscription/teams/enroll] lock state', e);
    return { locked: true, block: null };
  }
}

export async function POST(request: NextRequest) {
  if (!teamSubscriptionsEnabled()) {
    return NextResponse.json({ detail: 'Teams membership is not yet available.' }, { status: 503 });
  }

  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Sign in required.' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as { slug?: string };
  const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : '';
  if (!slug) {
    return NextResponse.json({ detail: 'Course slug is required.' }, { status: 400 });
  }

  // Entitlement gate — getTeamEntitlements fails closed (not-entitled) on error.
  const ent = await getTeamEntitlements(claims.sub);
  if (!ent.hasActiveSeat) {
    return NextResponse.json(
      {
        detail:
          ent.reason === 'seat_full'
            ? 'Your team has no seat available for you. Ask the owner to add seats.'
            : ent.reason === 'lapsed'
              ? 'Your team membership has lapsed. Ask the owner to renew — your progress and certificates are retained.'
              : 'An active team seat is required to enrol this way.',
        reason: ent.reason,
      },
      { status: 403 }
    );
  }

  const course = await getPublishedCourseForCheckout(slug);
  if (!course) {
    return NextResponse.json(
      { detail: 'Course not found in published catalogue.' },
      { status: 404 }
    );
  }

  try {
    // 'lock' (DECISIONS #53): a member without the prerequisite gets an active, gated seat.
    const result = await enrollStudentInCourse(claims, slug, `team-seat:${ent.teamId}`, {
      onPrerequisiteNotMet: 'lock',
    });
    const { locked, block } = await readSeatLock(
      claims,
      slug,
      result === 'already_enrolled' ? null : result.courseId
    );
    const learnPath = locked
      ? `/courses/${encodeURIComponent(slug)}`
      : ((await getFirstLessonLearnPath(slug)) ?? '/dashboard/student');

    if (result !== 'already_enrolled') {
      void sendEnrollmentWelcomeEmail({
        studentId: claims.sub,
        courseSlug: slug,
        appOrigin: request.nextUrl.origin,
      }).catch((e) => console.error('[subscription/teams/enroll] email', e));
      notifyCrmEnrollmentCreated({
        enrollmentId: result.enrollmentId,
        studentId: claims.sub,
        courseId: result.courseId,
      });
    }

    return NextResponse.json({
      ok: true,
      already_enrolled: result === 'already_enrolled',
      learn_url: learnPath,
      included_in_membership: true,
      enrolled: true,
      locked,
      ...(locked
        ? {
            code: block?.code ?? null,
            detail: block?.detail ?? "Complete this course's prerequisite first.",
            prerequisites: block?.prerequisites ?? [],
          }
        : {}),
    });
  } catch (e) {
    if (isPrerequisiteNotMetError(e)) {
      return NextResponse.json(prerequisiteBlockBody(e.block), { status: 403 });
    }
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'COURSE_NOT_FOUND') {
      return NextResponse.json({ detail: 'Course not found' }, { status: 404 });
    }
    console.error('[subscription/teams/enroll]', e);
    return NextResponse.json({ detail: 'Enrolment failed' }, { status: 500 });
  }
}
