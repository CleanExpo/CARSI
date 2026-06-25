import { NextRequest, NextResponse } from 'next/server';

import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { getRenewalSummaryForStudent } from '@/lib/server/renewal-summary';

export async function GET(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json(
      { detail: 'Renewal data requires a configured database.' },
      { status: 503 }
    );
  }

  const summary = await getRenewalSummaryForStudent(claims.sub);
  if (!summary) {
    return NextResponse.json({ detail: 'Could not load renewal summary.' }, { status: 500 });
  }

  return NextResponse.json(summary);
}
