import { NextRequest, NextResponse } from 'next/server';

import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { decideCoachingPortalEntitlement } from '@/lib/server/carsi-coaching-entitlement';
import {
  getOnboardingSubmitEligibility,
  submitCoachingOnboardingToCoach,
} from '@/lib/server/carsi-coaching-onboarding-submit';
import { getCoachingPortalRowForUser } from '@/lib/server/carsi-coaching-subscription-store';

export async function GET(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) return NextResponse.json({ detail: 'Sign in required.' }, { status: 401 });

  const eligibility = await getOnboardingSubmitEligibility(claims.sub);
  return NextResponse.json(eligibility);
}

export async function POST(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) return NextResponse.json({ detail: 'Sign in required.' }, { status: 401 });

  const sub = await getCoachingPortalRowForUser(claims.sub);
  const entitlement = decideCoachingPortalEntitlement(
    sub ? { status: sub.status, currentPeriodEnd: sub.currentPeriodEnd } : null
  );
  if (!entitlement.entitled) {
    return NextResponse.json({ detail: 'Active coaching subscription required.' }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    problemStatement?: string;
    goalStatement?: string;
    extraNotes?: string;
    confirm?: boolean;
  } | null;

  if (!body?.confirm) {
    return NextResponse.json({ detail: 'Please confirm your submission.' }, { status: 400 });
  }

  const result = await submitCoachingOnboardingToCoach(claims, {
    problemStatement: typeof body.problemStatement === 'string' ? body.problemStatement : '',
    goalStatement: typeof body.goalStatement === 'string' ? body.goalStatement : '',
    extraNotes: typeof body.extraNotes === 'string' ? body.extraNotes : '',
  });

  if (!result.ok) {
    const status =
      result.code === 'already_submitted' ? 409 : result.code === 'validation' ? 400 : 400;
    return NextResponse.json({ detail: result.detail, code: result.code }, { status });
  }

  return NextResponse.json({ submittedAt: result.submittedAt });
}
