import { type NextRequest, NextResponse } from 'next/server';

import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { getEmailPreferences, setEmailOptOut } from '@/lib/server/email-preferences';

/** GET /api/lms/notifications/email-preferences — current user's email opt-out state. */
export async function GET(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ email_opt_out: false });
  }

  try {
    return NextResponse.json(await getEmailPreferences(claims.sub));
  } catch (e) {
    console.error('[email-preferences] GET', e);
    return NextResponse.json({ detail: 'Failed to load email preferences' }, { status: 500 });
  }
}

/** PATCH /api/lms/notifications/email-preferences — set the opt-out flag. Body: { email_opt_out: boolean }. */
export async function PATCH(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  let body: { email_opt_out?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON body' }, { status: 400 });
  }
  if (typeof body.email_opt_out !== 'boolean') {
    return NextResponse.json({ detail: 'email_opt_out must be a boolean' }, { status: 400 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ email_opt_out: body.email_opt_out });
  }

  try {
    return NextResponse.json(await setEmailOptOut(claims.sub, body.email_opt_out));
  } catch (e) {
    console.error('[email-preferences] PATCH', e);
    return NextResponse.json({ detail: 'Failed to update email preferences' }, { status: 500 });
  }
}
