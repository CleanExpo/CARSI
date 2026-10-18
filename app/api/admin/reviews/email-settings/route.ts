import { NextResponse, type NextRequest } from 'next/server';

import { prisma } from '@/lib/prisma';
import { NotCurrentAdminError, resolveCurrentAdmin } from '@/lib/server/current-admin';
import { readReviewAdminSession } from '@/lib/server/review-admin-session';
import { databaseUnavailableResponse, isDatabaseConfigured } from '@/lib/server/database-unavailable';
import {
  listReviewRequestSwitchEvents,
  readReviewRequestSettings,
  setReviewRequestEmailsEnabled,
  SwitchBusyError,
} from '@/lib/server/review-request-email';

/**
 * GET/POST /api/admin/reviews/email-settings — the review-request email switch (spec D10d, D10e).
 * Admin only. Switching ON affects completions recorded from that moment only: the database marks
 * an enrolment eligible at completion, so nothing completed while the switch was off is ever
 * emailed. Switching OFF stops any send that has not yet started. Every change is appended to an
 * audit history with the old value, the new value and a durable snapshot of the verified admin.
 * The admin's current active flag and role are re-checked in the database on every request (the
 * shared resolveCurrentAdmin), and a change that cannot be attributed to a currently authorised
 * admin is refused. A change waits for any in-flight send; if one outlasts the bound, 409 (retry).
 */
export async function GET() {
  const session = await readReviewAdminSession();
  if (!session) return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  if (!isDatabaseConfigured()) return databaseUnavailableResponse();
  if (!(await resolveCurrentAdmin(prisma, session))) {
    return NextResponse.json({ detail: 'Only current admins can view this.' }, { status: 403 });
  }
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
  const session = await readReviewAdminSession();
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
    const saved = await setReviewRequestEmailsEnabled(payload.enabled, session);
    return NextResponse.json({ enabled: saved.enabled, changed_at: saved.changedAt.toISOString() });
  } catch (e) {
    if (e instanceof NotCurrentAdminError) {
      return NextResponse.json(
        { detail: 'This change cannot be attributed to a currently authorised admin, so it was not made.' },
        { status: 403 }
      );
    }
    if (e instanceof SwitchBusyError) {
      return NextResponse.json({ detail: e.message, busy: true }, { status: 409 });
    }
    console.error('[admin/reviews/email-settings POST]', e);
    return NextResponse.json({ detail: 'Failed to update the review-request email switch' }, { status: 500 });
  }
}
