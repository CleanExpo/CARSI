import { NextRequest, NextResponse } from 'next/server';

import { applyRateLimit, clientIpFrom, UNKNOWN_IP } from '@/lib/rate-limit';
import { isCcwAttendanceEnabled } from '@/lib/server/ccw-attendance/flag';
import { recordCheckIn } from '@/lib/server/ccw-attendance/checkin-service';
import { verifyCheckInToken } from '@/lib/server/ccw-attendance/checkin-token';
import { captureServerError } from '@/lib/server/sentry';
import { verifyTurnstileToken } from '@/lib/server/turnstile';

// Self-service door endpoint — cap per-IP attempts so a single device/QR leak
// can't spray the sign-in table (defence-in-depth alongside Turnstile + the
// event-scoped token). Mirrors the guest-free hardening.
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const PUBLIC_CHECKIN_RECEIPT = {
  ok: true,
  status: 'received',
  message: 'Your check-in submission has been received. If you need help, please see an organiser.',
} as const;

/**
 * POST /api/events/ccw-roadshow/checkin — admin-supervised self-service check-in.
 *
 * DARK behind `CCW_ATTENDANCE_ENABLED` (404 when off). Authorised ONLY by the
 * event-day-scoped check-in token (never an admin/user session). Hardened like
 * the guest-free enrol route: same-site JSON content-type check (CSRF),
 * per-IP rate-limit, and Cloudflare Turnstile. Provisioning/enrolment/email
 * are NOT done here — the door write is local + fast and awaits no external I/O.
 */
export async function POST(request: NextRequest) {
  // Feature flag: the whole surface is invisible until an operator enables it.
  if (!isCcwAttendanceEnabled()) {
    return NextResponse.json({ detail: 'Not found' }, { status: 404 });
  }

  // CSRF-safe: only accept genuine same-site JSON submissions.
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return NextResponse.json({ detail: 'Unsupported content type' }, { status: 415 });
  }

  const ip = clientIpFrom(request.headers.get('x-forwarded-for'), request.headers.get('x-real-ip'));
  const rl = applyRateLimit(ip, RATE_LIMIT, RATE_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { detail: 'Too many requests. Please try again in a moment.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      }
    );
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Check-in is not available right now.' }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    token?: string;
    dayIndex?: number;
    fullName?: string;
    businessName?: string;
    email?: string;
    turnstileToken?: string;
  };

  const turnstile = await verifyTurnstileToken(body.turnstileToken, ip === UNKNOWN_IP ? null : ip);
  if (!turnstile.ok) {
    return NextResponse.json({ detail: 'Verification failed. Please try again.' }, { status: 403 });
  }

  // Event-scoped token is the sole authorisation. Its scope (event + day) is
  // authoritative; the client-sent dayIndex must agree with it.
  const tokenResult = await verifyCheckInToken(body.token);
  if (!tokenResult.ok) {
    return NextResponse.json(
      {
        code: tokenResult.reason === 'wrong_day' ? 'token_expired' : 'token_invalid',
        detail:
          "This check-in code has expired. Please scan today's QR code, or ask an organiser for a new link.",
      },
      { status: 403 }
    );
  }
  const { eventSlug, dayIndex } = tokenResult.scope;

  if (body.dayIndex != null && body.dayIndex !== dayIndex) {
    return NextResponse.json(
      {
        code: 'day_mismatch',
        detail: 'This code is for a different day. Please scan the current QR code.',
      },
      { status: 403 }
    );
  }

  const fullName = body.fullName?.trim() ?? '';
  const email = body.email?.trim() ?? '';
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!fullName || !emailValid) {
    return NextResponse.json(
      { code: 'invalid_input', detail: 'A full name and a valid email are required.' },
      { status: 400 }
    );
  }

  try {
    const result = await recordCheckIn({
      eventSlug,
      dayIndex,
      fullName,
      email,
      businessName: body.businessName,
      source: 'self',
    });

    switch (result.status) {
      case 'invalid_event':
        return NextResponse.json(
          { code: 'invalid_event', detail: 'This event is not recognised.' },
          { status: 400 }
        );

      case 'email_collision_different_name':
      case 'already_checked_in':
      case 'checked_in':
        // Deliberately neutral and byte-equivalent: a venue-token holder must
        // not learn whether this email/name is new, repeated, or collides with
        // an existing attendee. The service still preserves no-merge/no-write.
        return NextResponse.json(PUBLIC_CHECKIN_RECEIPT);

      case 'at_capacity':
        return NextResponse.json(
          {
            code: 'at_capacity',
            detail:
              'This event has reached capacity. Please see an organiser — they can add you at the door.',
          },
          { status: 409 }
        );

      default:
        // Exhaustiveness guard.
        return NextResponse.json({ detail: 'Check-in failed.' }, { status: 500 });
    }
  } catch (e) {
    console.error('[ccw-checkin]', e);
    void captureServerError(e, { route: '/api/events/ccw-roadshow/checkin' });
    return NextResponse.json({ detail: 'Check-in failed. Please try again.' }, { status: 500 });
  }
}
