import { NextRequest, NextResponse } from 'next/server';

import { verifySessionToken } from '@/lib/auth/session-jwt';
import { getRenewalSummaryForStudent } from '@/lib/server/renewal-summary';

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
    return NextResponse.json(
      { detail: 'Renewal data requires a configured database.' },
      { status: 503 }
    );
  }

  const summary = await getRenewalSummaryForStudent(claims.sub);
  if (!summary) {
    return NextResponse.json(
      { detail: 'Could not load renewal summary.' },
      { status: 500 }
    );
  }

  return NextResponse.json(summary);
}
