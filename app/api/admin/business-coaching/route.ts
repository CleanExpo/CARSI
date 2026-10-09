import { NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { businessCoachingSessions } from '@/lib/marketing/business-coaching';
import {
    getBusinessCoachingAvailability,
    listBusinessCoachingRegistry,
} from '@/lib/server/business-coaching-registry';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rows = await listBusinessCoachingRegistry();

    if (request.nextUrl.searchParams.get('format') === 'csv') {
      const header = [
        'created_at',
        'session_slug',
        'status',
        'seats',
        'package',
        'email',
        'business',
        'phone',
        'attendees',
        'amount_cents',
        'stripe_session',
      ];
      const lines = rows.map((r) =>
        [
          r.createdAt.toISOString(),
          r.sessionSlug,
          r.status,
          String(r.seatCount),
          r.packageId,
          r.contactEmail,
          r.companyName ?? '',
          r.contactPhone ?? '',
          r.attendees.map((a) => a.fullName).join('; '),
          r.amountTotalCents != null ? String(r.amountTotalCents) : '',
          r.stripeSessionId ?? '',
        ]
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(','),
      );
      const csv = [header.join(','), ...lines].join('\n');
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="owner-circle-registry.csv"',
        },
      });
    }

    const sessions = await Promise.all(
      businessCoachingSessions.map(async (s) => {
        const availability = await getBusinessCoachingAvailability(s.slug, s.capacity);
        const waitlisted = rows
          .filter((r) => r.sessionSlug === s.slug && r.status === 'waitlisted')
          .reduce((sum, r) => sum + r.seatCount, 0);
        return {
          slug: s.slug,
          monthLabel: s.monthLabel,
          capacity: s.capacity,
          confirmed: availability.confirmed,
          remaining: availability.remaining,
          waitlisted,
        };
      }),
    );

    return NextResponse.json({
      sessions,
      rows: rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('[admin/business-coaching]', error);
    return NextResponse.json({ detail: 'Failed to load registry.' }, { status: 500 });
  }
}
