import { type NextRequest, NextResponse } from 'next/server';

import { verifyProofPackShareToken } from '@/lib/auth/session-jwt';
import { getProofPackPayloadForStudent } from '@/lib/server/proof-pack';

export const dynamic = 'force-dynamic';

/**
 * GET — public JSON for a training record when `t` is a valid share token (minted from dashboard).
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('t')?.trim();
  if (!token) {
    return NextResponse.json({ detail: 'Missing token' }, { status: 400 });
  }

  const userId = await verifyProofPackShareToken(token);
  if (!userId) {
    return NextResponse.json({ detail: 'Invalid or expired link' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Service unavailable' }, { status: 503 });
  }

  const payload = await getProofPackPayloadForStudent(userId, request.nextUrl.origin);
  if (!payload) {
    return NextResponse.json({ detail: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } });
}
