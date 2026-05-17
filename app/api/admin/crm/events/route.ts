import { NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { prisma } from '@/lib/prisma';

/** GET /api/admin/crm/events — recent CRM webhook delivery log (Phase 3). */
export async function GET(request: Request) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ items: [], total: 0 });
  }

  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 50)));

  try {
    const [items, total] = await Promise.all([
      prisma.crmEventLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.crmEventLog.count(),
    ]);

    return NextResponse.json({
      total,
      items: items.map((row) => ({
        id: row.id,
        event_type: row.eventType,
        status: row.status,
        response_status: row.responseStatus,
        created_at: row.createdAt.toISOString(),
        payload: row.payload,
      })),
    });
  } catch (e) {
    console.error('[admin/crm/events]', e);
    return NextResponse.json({ detail: 'Failed to load CRM events' }, { status: 500 });
  }
}
