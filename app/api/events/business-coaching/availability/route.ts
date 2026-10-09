import { NextRequest, NextResponse } from 'next/server';

import {
    businessCoachingSessions,
    getBusinessCoachingSession,
} from '@/lib/marketing/business-coaching';
import { getBusinessCoachingAvailability } from '@/lib/server/business-coaching-registry';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('session');

  if (slug) {
    const session = getBusinessCoachingSession(slug);
    if (!session) {
      return NextResponse.json({ detail: 'Unknown session.' }, { status: 404 });
    }
    const availability = await getBusinessCoachingAvailability(session.slug, session.capacity);
    return NextResponse.json(availability);
  }

  const entries = await Promise.all(
    businessCoachingSessions.map(async (session) => [
      session.slug,
      await getBusinessCoachingAvailability(session.slug, session.capacity),
    ] as const),
  );
  return NextResponse.json({ sessions: Object.fromEntries(entries) });
}
