import { NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { getAttributionReport } from '@/lib/server/event-attribution';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  try {
    const report = await getAttributionReport();
    return NextResponse.json(report, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('[admin/attribution/report] failed:', error);
    return NextResponse.json({ detail: 'Attribution report unavailable.' }, { status: 500 });
  }
}
