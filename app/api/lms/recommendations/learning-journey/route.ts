import { NextRequest, NextResponse } from 'next/server';

import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { getLearnerLearningJourney } from '@/lib/server/learner-learning-journey';

export async function GET(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({
      course_recommendations: [],
      activity_nudges: [],
      skill_gaps: [],
      pathway_next: null,
      headline: null,
    });
  }

  const focus = request.nextUrl.searchParams.get('course')?.trim() || undefined;
  const journey = await getLearnerLearningJourney(claims.sub, { focusCourseSlug: focus });
  return NextResponse.json(journey);
}