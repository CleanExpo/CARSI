import { type NextRequest, NextResponse } from 'next/server';

import { signProofPackShareToken } from '@/lib/auth/session-jwt';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';

export const dynamic = 'force-dynamic';

/**
 * POST — mint a time-limited public URL (no login) for the training / CEC summary page + PDF.
 */
export async function POST(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  const token = await signProofPackShareToken(claims.sub);
  const origin = request.nextUrl.origin;
  const url = `${origin}/verify/training-record?t=${encodeURIComponent(token)}`;

  return NextResponse.json({
    url,
    expires_in_days: 30,
  });
}
