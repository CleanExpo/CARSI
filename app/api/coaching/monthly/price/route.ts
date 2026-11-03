import { NextRequest, NextResponse } from 'next/server';

import { coachPriceDisclosure } from '@/lib/coaching-portal/coaches';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { getCoachForMember } from '@/lib/server/carsi-coaching-coaches';

/**
 * The monthly price this visitor would be charged (GP-632). Signed-out visitors and members
 * without a coach see the default chapter; a partner member sees their coach's price, so the
 * subscribe button never shows one amount and charges another.
 */
export async function GET(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  try {
    const coach = claims ? await getCoachForMember(claims.sub) : null;
    return NextResponse.json(coachPriceDisclosure(coach), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('[coaching/monthly/price]', error);
    return NextResponse.json({ detail: 'Price unavailable.' }, { status: 503 });
  }
}
