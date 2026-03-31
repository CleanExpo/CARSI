import { NextRequest, NextResponse } from 'next/server';

import { verifySessionToken } from '@/lib/auth/session-jwt';
import { setOnboardingCompletedCookie } from '@/lib/auth/onboarding-cookie';
import { getUpstreamBaseUrl } from '@/lib/server/upstream-api';

/**
 * POST onboarding answers. Sets an httpOnly cookie so GET /api/lms/auth/me can
 * return onboarding_completed without a database (local / headless dev).
 */
export async function POST(request: NextRequest) {
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
  const body = await request.text();

  if (upstream) {
    const url = `${upstream.replace(/\/$/, '')}/api/lms/auth/onboarding`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: auth,
        'content-type': request.headers.get('content-type') || 'application/json',
      },
      body: body || undefined,
      cache: 'no-store',
    });
    const contentType = res.headers.get('content-type') || 'application/json';
    const buf = await res.arrayBuffer();
    const response = new NextResponse(buf, {
      status: res.status,
      headers: { 'content-type': contentType },
    });
    if (res.ok) {
      setOnboardingCompletedCookie(response, claims.sub);
    }
    return response;
  }

  const response = NextResponse.json({
    recommended_pathway: 'Explore courses',
    pathway_description:
      'Browse the catalogue and start with a course that matches your discipline.',
    /** Post-wizard navigation — learner hub, not the public catalogue. */
    suggested_courses_url: '/dashboard',
  });
  setOnboardingCompletedCookie(response, claims.sub);
  return response;
}
