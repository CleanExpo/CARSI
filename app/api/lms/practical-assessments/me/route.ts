import { type NextRequest, NextResponse } from 'next/server';

import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { listStudentSubmissions } from '@/lib/server/practical-assessment';

/** GET /api/lms/practical-assessments/me — the current student's submissions (GP-457). */
export async function GET(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }
  const submissions = await listStudentSubmissions(claims.sub);
  return NextResponse.json({ submissions });
}
