import { NextRequest, NextResponse } from 'next/server';

import {
  getBearerAuthorizationFromRequest,
  getSessionClaimsFromRequest,
} from '@/lib/server/auth-from-request';
import { getResumeSnapshotForStudent } from '@/lib/server/learner-dashboard-data';
import { getUpstreamBaseUrl } from '@/lib/server/upstream-api';

/**
 * GET — best “continue where you left off” lesson for the signed-in learner.
 */
export async function GET(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  const upstream = getUpstreamBaseUrl();
  if (upstream) {
    const auth = getBearerAuthorizationFromRequest(request);
    const url = `${upstream.replace(/\/$/, '')}/api/lms/learner/resume`;
    const res = await fetch(url, {
      headers: { authorization: auth ?? '', cookie: request.headers.get('cookie') ?? '' },
      cache: 'no-store',
    });
    const contentType = res.headers.get('content-type') || 'application/json';
    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      status: res.status,
      headers: { 'content-type': contentType },
    });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json(null);
  }

  const snapshot = await getResumeSnapshotForStudent(claims.sub);
  return NextResponse.json(snapshot);
}
