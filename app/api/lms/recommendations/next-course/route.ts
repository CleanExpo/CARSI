import { NextRequest, NextResponse } from 'next/server';

import { verifySessionToken } from '@/lib/auth/session-jwt';
import { getNextCourseRecommendationsForStudent } from '@/lib/server/renewal-summary';

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }
  const claims = await verifySessionToken(auth.slice(7));
  if (!claims) {
    return NextResponse.json({ detail: 'Invalid token' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json([]);
  }

  const items = await getNextCourseRecommendationsForStudent(claims.sub);
  return NextResponse.json(items);
}
