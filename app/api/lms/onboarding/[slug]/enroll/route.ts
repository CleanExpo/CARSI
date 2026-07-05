import { NextRequest, NextResponse } from 'next/server';

import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { enrollStudentInCourse } from '@/lib/server/enrollment-service';
import { getOrgEntitlements } from '@/lib/server/entitlements';
import { getOnboardingCourseBySlug } from '@/lib/server/onboarding-programs';
import { subscriptionsEnabled } from '@/lib/server/subscriptions-flag';

type Ctx = { params: Promise<{ slug: string }> };

/**
 * Direct enrolment for onboarding programs.
 *
 * WS1-E3 (GP-443): a member of an ACTIVE organisation subscription that entitles
 * this course's category enrols at no extra charge (unlimited seats). Everyone
 * else must complete checkout first — direct enrolment stays gated (402) so the
 * course can safely be flipped off `isFree` without stranding non-subscribers.
 *
 * Ships DARK: when SUBSCRIPTIONS_ENABLED is off, the org path is inert and the
 * route behaves exactly as before (always 402). Fails closed on any uncertainty.
 */
export async function POST(request: NextRequest, ctx: Ctx) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  const { slug: rawSlug } = await ctx.params;
  const slug = rawSlug.trim().toLowerCase();
  const course = await getOnboardingCourseBySlug(slug);
  if (!course) {
    return NextResponse.json({ detail: 'Program not found' }, { status: 404 });
  }

  // Org-subscription entitlement path (dark behind the flag).
  if (subscriptionsEnabled()) {
    const ent = await getOrgEntitlements(claims.sub);
    const inScope =
      ent.hasActiveOrg &&
      ent.entitledCategory != null &&
      (course.category ?? '').trim() === ent.entitledCategory.trim();

    if (inScope) {
      try {
        const result = await enrollStudentInCourse(claims, slug, `org:${ent.teamId}`);
        return NextResponse.json({
          ok: true,
          enrolled: true,
          already_enrolled: result === 'already_enrolled',
          included_in_org_subscription: true,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg === 'COURSE_NOT_FOUND') {
          return NextResponse.json({ detail: 'Program not found' }, { status: 404 });
        }
        console.error('[onboarding/enroll] org enrol failed:', e);
        return NextResponse.json({ detail: 'Enrolment failed' }, { status: 500 });
      }
    }
  }

  return NextResponse.json(
    {
      detail: 'Organisation subscription required. Complete checkout to access this program.',
      checkout_required: true,
    },
    { status: 402 }
  );
}
