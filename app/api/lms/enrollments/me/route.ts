import { NextRequest, NextResponse } from 'next/server';

import { verifySessionToken } from '@/lib/auth/session-jwt';
import { getEnrollmentsForStudent } from '@/lib/server/learner-dashboard-data';
import { nextResponseFromFetch } from '@/lib/server/proxy-fetch-response';
import { getUpstreamBaseUrl } from '@/lib/server/upstream-api';

/**
 * Learner enrollments: Postgres via Prisma when DATABASE_URL is set; otherwise
 * proxy to upstream LMS or return [] (handled after proxy check).
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }
  const token = auth.slice(7);
  const claims = await verifySessionToken(token);
  if (!claims) {
    return NextResponse.json({ detail: 'Invalid token' }, { status: 401 });
  }

  const upstream = getUpstreamBaseUrl();
  if (upstream) {
    const url = `${upstream.replace(/\/$/, '')}/api/lms/enrollments/me`;
    const res = await fetch(url, {
      headers: { authorization: auth, cookie: request.headers.get('cookie') ?? '' },
      cache: 'no-store',
    });
    return nextResponseFromFetch(res);
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json([]);
  }

  const items = await getEnrollmentsForStudent(claims.sub);
  return NextResponse.json(items);
}
