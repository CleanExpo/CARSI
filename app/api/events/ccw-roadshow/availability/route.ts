import { NextRequest, NextResponse } from 'next/server';

import { ccwRoadshowEvents, getCcwRoadshowEvent } from '@/lib/marketing/ccw-roadshow';
import { getRoadshowAvailability } from '@/lib/server/ccw-roadshow-registry';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('event');

  if (slug) {
    const event = getCcwRoadshowEvent(slug);
    if (!event) {
      return NextResponse.json({ detail: 'Unknown event.' }, { status: 404 });
    }
    const availability = await getRoadshowAvailability(event.slug, event.capacity);
    return NextResponse.json(availability);
  }

  const entries = await Promise.all(
    ccwRoadshowEvents.map(async (event) => [
      event.slug,
      await getRoadshowAvailability(event.slug, event.capacity),
    ] as const),
  );
  return NextResponse.json({ events: Object.fromEntries(entries) });
}
