import { NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { ccwRoadshowEvents } from '@/lib/marketing/ccw-roadshow';
import {
  deleteRoadshowRegistration,
  getRoadshowAvailability,
  listRoadshowRegistry,
} from '@/lib/server/ccw-roadshow-registry';
import { registryToCsv } from '@/lib/server/ccw-roadshow-csv';

export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { registrationId?: string };
  const registrationId = body.registrationId?.trim();
  if (!registrationId) {
    return NextResponse.json({ detail: 'registrationId is required.' }, { status: 400 });
  }

  try {
    await deleteRoadshowRegistration(registrationId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin/ccw-roadshow] delete failed:', error);
    return NextResponse.json({ detail: 'Failed to delete registration.' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  try {
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
  } catch (error) {
    console.error('[admin/ccw-roadshow] failed to load registry:', error);
    return NextResponse.json({ detail: 'Failed to load registry.' }, { status: 500 });
  }
}
