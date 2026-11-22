import { type NextRequest, NextResponse } from 'next/server';

import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { getProofPackPayloadForStudent } from '@/lib/server/proof-pack';

export const dynamic = 'force-dynamic';

/**
 * GET — JSON transcript + CEC summary for the signed-in learner (employer / insurer pack).
 */
export async function GET(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  const payload = await getProofPackPayloadForStudent(claims.sub, request.nextUrl.origin);
  if (!payload) {
    return NextResponse.json({ detail: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } });
}
