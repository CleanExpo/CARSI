import { type NextRequest, NextResponse } from 'next/server';

import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { listAvailableAssessmentsForStudent } from '@/lib/server/practical-assessment';

/**
 * GET /api/lms/practical-assessments — published practical assessments for the student's
 * enrolled courses, each with rubric + their latest submission status (GP-457).
 */
export async function GET(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }
  const assessments = await listAvailableAssessmentsForStudent(claims.sub);
  return NextResponse.json({ assessments });
}
