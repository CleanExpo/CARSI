import { NextResponse, type NextRequest } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { databaseUnavailableResponse, isDatabaseConfigured } from '@/lib/server/database-unavailable';
import {
  listReviewRequestSwitchEvents,
  readReviewRequestSettings,
  setReviewRequestEmailsEnabled,
  UnattributableSwitchChangeError,
} from '@/lib/server/review-request-email';

/**
 * GET/POST /api/admin/reviews/email-settings — the review-request email switch (spec D10d, D10e).
 * Admin only. Switching ON affects completions recorded from that moment only: the database marks
 * an enrolment eligible at completion, so nothing completed while the switch was off is ever
 * emailed. Switching OFF stops any send that has not yet started. Every change is appended to an
 * audit history with the old value, the new value and a durable snapshot of the verified admin.
 * The admin's current active flag and role are re-checked in the database on every request, and a
 * change that cannot be attributed to a currently authorised admin is refused.
 */
export async function GET() {
  if (!(await getAdminSessionOrNull())) return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  if (!isDatabaseConfigured()) return databaseUnavailableResponse();
  const [settings, history] = await Promise.all([readReviewRequestSettings(), listReviewRequestSwitchEvents()]);
  return NextResponse.json({
    enabled: settings.enabled,
    settings_missing: settings.missing,
    history: history.map((h) => ({
      old_enabled: h.oldEnabled,
      new_enabled: h.newEnabled,
      actor_kind: h.actorKind,
      actor_email: h.actorEmail,
      at: h.createdAt.toISOString(),
    })),
  });
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
    // The admin is re-validated from the database inside the switch transaction, not from the token.
    const saved = await setReviewRequestEmailsEnabled(payload.enabled, session.email);
    return NextResponse.json({ enabled: saved.enabled, changed_at: saved.changedAt.toISOString() });
  } catch (e) {
    if (e instanceof UnattributableSwitchChangeError) {
      return NextResponse.json(
        { detail: 'This change cannot be attributed to a currently authorised admin, so it was not made.' },
        { status: 403 }
      );
    }
    console.error('[admin/reviews/email-settings POST]', e);
    return NextResponse.json({ detail: 'Failed to update the review-request email switch' }, { status: 500 });
  }
}
