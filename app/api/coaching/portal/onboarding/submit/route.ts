import { NextRequest, NextResponse } from 'next/server';

import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import {
  getOnboardingSubmitEligibility,
  submitCoachingOnboardingToCoach,
} from '@/lib/server/carsi-coaching-onboarding-submit';
import { requireCoachingPortalEditor } from '@/lib/server/carsi-coaching-portal-gate';

export async function GET(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) return NextResponse.json({ detail: 'Sign in required.' }, { status: 401 });

  const eligibility = await getOnboardingSubmitEligibility(claims.sub);
  return NextResponse.json(eligibility);
}

export async function POST(request: NextRequest) {
  const gate = await requireCoachingPortalEditor(request);
  if ('error' in gate) return gate.error;
  const claims = gate.claims;

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
