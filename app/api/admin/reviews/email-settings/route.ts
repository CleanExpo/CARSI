import { NextResponse, type NextRequest } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { prisma } from '@/lib/prisma';
import { databaseUnavailableResponse, isDatabaseConfigured } from '@/lib/server/database-unavailable';
import { readReviewRequestSettings, setReviewRequestEmailsEnabled } from '@/lib/server/review-request-email';

/**
 * GET/POST /api/admin/reviews/email-settings — the review-request email switch (spec D10d).
 * Admin only. Switching ON affects completions recorded from that moment only: the database marks
 * an enrolment eligible at completion, so nothing completed while the switch was off is ever
 * emailed. Switching OFF stops sending immediately. Each change records who and when.
 */
export async function GET() {
  if (!(await getAdminSessionOrNull())) return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  if (!isDatabaseConfigured()) return databaseUnavailableResponse();
  const settings = await readReviewRequestSettings();
  return NextResponse.json({ enabled: settings.enabled, settings_missing: settings.missing });
}

export async function POST(request: NextRequest) {
  const session = await getAdminSessionOrNull();
  if (!session) return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });

  let payload: { enabled?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON body' }, { status: 400 });
  }
  if (typeof payload.enabled !== 'boolean') {
    return NextResponse.json({ detail: 'enabled must be a boolean' }, { status: 400 });
  }
  if (!isDatabaseConfigured()) return databaseUnavailableResponse();

  try {
    const actor = await prisma.lmsUser.findUnique({ where: { email: session.email }, select: { id: true } });
    const saved = await setReviewRequestEmailsEnabled(payload.enabled, actor?.id ?? null);
    return NextResponse.json({ enabled: saved.enabled, changed_at: saved.changedAt?.toISOString() ?? null });
  } catch (e) {
    console.error('[admin/reviews/email-settings POST]', e);
    return NextResponse.json({ detail: 'Failed to update the review-request email switch' }, { status: 500 });
  }
}
