import { NextRequest, NextResponse } from 'next/server';

import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { getOnboardingCourseBySlug } from '@/lib/server/onboarding-programs';

type Ctx = { params: Promise<{ slug: string }> };

/**
 * Direct enrolment is disabled for paid onboarding programs — use checkout first.
 */
export async function POST(_request: NextRequest, ctx: Ctx) {
  const claims = await getSessionClaimsFromRequest(_request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  const { slug: rawSlug } = await ctx.params;
  const slug = rawSlug.trim().toLowerCase();
  const course = await getOnboardingCourseBySlug(slug);
  if (!course) {
    return NextResponse.json({ detail: 'Program not found' }, { status: 404 });
  }

  return NextResponse.json(
    {
      detail: 'Organisation subscription required. Complete checkout to access this program.',
      checkout_required: true,
    },
    { status: 402 }
  );
}
