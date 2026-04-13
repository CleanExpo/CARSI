import { NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { adminBulkSetCoursePublished } from '@/lib/admin/admin-courses-service';

export async function POST(request: NextRequest) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as unknown;
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ detail: 'Invalid JSON body' }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const idsRaw = o.ids;
  const published = o.published;
  if (!Array.isArray(idsRaw) || typeof published !== 'boolean') {
    return NextResponse.json(
      { detail: 'Expected { ids: string[], published: boolean }' },
      { status: 400 }
    );
  }

  const ids = idsRaw.filter((id): id is string => typeof id === 'string' && id.trim().length > 0);

  try {
    const { count } = await adminBulkSetCoursePublished(ids, published);
    return NextResponse.json({ updated: count });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'BULK_LIMIT') {
      return NextResponse.json({ detail: 'Too many course ids in one request' }, { status: 400 });
    }
    console.error('[admin/courses/bulk-status POST]', e);
    return NextResponse.json({ detail: 'Failed to update courses' }, { status: 500 });
  }
}
