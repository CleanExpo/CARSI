import { NextRequest, NextResponse } from 'next/server';

import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { getCoachingOnboardingPacketForUser } from '@/lib/server/carsi-coaching-onboarding-packet';

export async function GET(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) return NextResponse.json({ detail: 'Sign in required.' }, { status: 401 });

  const packet = await getCoachingOnboardingPacketForUser(claims.sub);
  return NextResponse.json(packet);
}
