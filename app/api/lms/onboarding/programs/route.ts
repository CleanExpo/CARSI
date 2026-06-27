import { NextRequest, NextResponse } from 'next/server';

import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { listOnboardingProgramsForUser } from '@/lib/server/onboarding-programs';

export async function GET(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ programs: [] });
  }

  try {
    const programs = await listOnboardingProgramsForUser(claims.sub);
    return NextResponse.json({ programs });
  } catch (e) {
    console.error('[onboarding/programs]', e);
    return NextResponse.json({ detail: 'Failed to load programs' }, { status: 500 });
  }
}
