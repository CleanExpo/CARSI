import { type NextRequest, NextResponse } from 'next/server';

import { verifyEmailVerificationToken } from '@/lib/auth/session-jwt';
import { markEmailVerified } from '@/lib/server/lms-auth';

/**
 * GP-699 — the write behind the "Confirm my email" button.
 *
 * POST /api/auth/verify-email   (form field: token)
 *
 * The welcome email links to the /confirm-email page, which changes nothing
 * when it is opened. Only this POST, sent when the person presses the button on
 * that page, marks the account verified. So a mail scanner that opens the link
 * cannot confirm an address. There is deliberately no GET handler here.
 *
 * The signed token (subject = user id, plus the address it was issued for) IS
 * the authorisation, so no session is needed: the person may open the email on
 * a different device. Always redirects to the login page on this site with
 * `email_confirmed=1` or `=0`; it never follows a caller-supplied destination,
 * and a failed write is reported as `0`, never as success.
 */
function done(confirmed: boolean): NextResponse {
  // A path-only Location: the browser resolves it against the address it
  // already has, so no request input (host, header or parameter) can choose
  // the destination. 303: the browser follows with a GET, so a refresh never
  // repeats the POST.
  return new NextResponse(null, {
    status: 303,
    headers: {
      Location: `/login?email_confirmed=${confirmed ? '1' : '0'}`,
      'Cache-Control': 'no-store',
    },
  });
}

async function tokenFromForm(request: NextRequest): Promise<string> {
  try {
    const value = (await request.formData()).get('token');
    return typeof value === 'string' ? value.trim() : '';
  } catch {
    return '';
  }
}

export async function POST(request: NextRequest) {
  const token = await tokenFromForm(request);
  if (!token) return done(false);

  const verified = await verifyEmailVerificationToken(token);
  if (!verified) return done(false);

  if (!process.env.DATABASE_URL?.trim()) return done(false);

  try {
    return done(await markEmailVerified(verified.userId, verified.email));
  } catch (e) {
    console.error('[verify-email]', e instanceof Error ? e.message : String(e));
    return done(false);
  }
}
