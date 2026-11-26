import { NextRequest, NextResponse } from 'next/server';

import { parseFocusCourseSlug } from '@/lib/lms/learner-journey-query';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { getLearnerLearningJourney } from '@/lib/server/learner-learning-journey';
import { EMPTY_LEARNER_LEARNING_JOURNEY } from '@/types/learner-learning-journey';

export async function GET(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json(EMPTY_LEARNER_LEARNING_JOURNEY);
  }

  const focus = parseFocusCourseSlug(request.nextUrl.searchParams.get('course'));

  try {
    const journey = await getLearnerLearningJourney(claims.sub, { focusCourseSlug: focus });
    return NextResponse.json(journey);
  } catch (err) {
    console.error('[api/lms/recommendations/learning-journey]', err);
    return NextResponse.json(
      { detail: 'Could not load your learning journey.' },
      { status: 500 }
    );
  }
}