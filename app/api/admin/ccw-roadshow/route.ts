import { NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { ccwRoadshowEvents } from '@/lib/marketing/ccw-roadshow';
import {
  getRoadshowAvailability,
  listRoadshowRegistry,
} from '@/lib/server/ccw-roadshow-registry';
import { registryToCsv } from '@/lib/server/ccw-roadshow-csv';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  const rows = await listRoadshowRegistry();

  if (request.nextUrl.searchParams.get('format') === 'csv') {
    const csv = registryToCsv(rows);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="ccw-roadshow-registry.csv"',
      },
    });
  }

  const cities = await Promise.all(
    ccwRoadshowEvents.map(async (event) => {
      const availability = await getRoadshowAvailability(event.slug, event.capacity);
      const waitlisted = rows
        .filter((r) => r.eventSlug === event.slug && r.status === 'waitlisted')
        .reduce((sum, r) => sum + r.seatCount, 0);
      return {
        slug: event.slug,
        city: event.city,
        capacity: event.capacity,
        confirmed: availability.confirmed,
        remaining: availability.remaining,
        waitlisted,
      };
    }),
  );

  return NextResponse.json({ cities, rows });
}
