import { type NextRequest, NextResponse } from 'next/server';

import { verifyEmailVerificationToken } from '@/lib/auth/session-jwt';
import { getAppOrigin } from '@/lib/server/app-url';
import { markEmailVerified } from '@/lib/server/lms-auth';

/**
 * GP-699 — confirm link from the registration welcome email.
 *
 * GET /api/auth/verify-email?token=...
 *
 * The signed token (subject = user id, plus the address it was issued for) IS
 * the authorisation, so no session is needed: the person may open the email on
 * a different device. Always redirects to the login page on this origin with
 * `email_confirmed=1` or `=0`; it never follows a caller-supplied destination,
 * and a failed write is reported as `0`, never as success.
 */
function done(request: NextRequest, confirmed: boolean): NextResponse {
  const url = new URL('/login', getAppOrigin(request));
  url.searchParams.set('email_confirmed', confirmed ? '1' : '0');
  return NextResponse.redirect(url, 307);
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')?.trim();
  if (!token) return done(request, false);

  const verified = await verifyEmailVerificationToken(token);
  if (!verified) return done(request, false);

  if (!process.env.DATABASE_URL?.trim()) return done(request, false);

  try {
    return done(request, await markEmailVerified(verified.userId, verified.email));
  } catch (e) {
    console.error('[verify-email]', e instanceof Error ? e.message : String(e));
    return done(request, false);
  }
}
