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

/**
 * POST /api/events/ccw-roadshow/checkin — admin-supervised self-service check-in.
 *
 * DARK behind `CCW_ATTENDANCE_ENABLED` (404 when off). Authorised ONLY by the
 * event-day-scoped check-in token (never an admin/user session). Hardened like
 * the guest-free enrol route: same-site JSON content-type check (CSRF),
 * per-IP rate-limit, and Cloudflare Turnstile. Provisioning/enrolment/CEC/email
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

  const ip = clientIpFrom(
    request.headers.get('x-forwarded-for'),
    request.headers.get('x-real-ip'),
  );
  const rl = applyRateLimit(ip, RATE_LIMIT, RATE_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { detail: 'Too many requests. Please try again in a moment.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      },
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
    iicrcRegNumber?: string;
    email?: string;
    turnstileToken?: string;
  };

  const turnstile = await verifyTurnstileToken(
    body.turnstileToken,
    ip === UNKNOWN_IP ? null : ip,
  );
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
      { status: 403 },
    );
  }
  const { eventSlug, dayIndex } = tokenResult.scope;

  if (body.dayIndex != null && body.dayIndex !== dayIndex) {
    return NextResponse.json(
      { code: 'day_mismatch', detail: 'This code is for a different day. Please scan the current QR code.' },
      { status: 403 },
    );
  }

  const fullName = body.fullName?.trim() ?? '';
  const email = body.email?.trim() ?? '';
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!fullName || !emailValid) {
    return NextResponse.json(
      { code: 'invalid_input', detail: 'A full name and a valid email are required.' },
      { status: 400 },
    );
  }

  try {
    const result = await recordCheckIn({
      eventSlug,
      dayIndex,
      fullName,
      email,
      businessName: body.businessName,
      iicrcRegNumber: body.iicrcRegNumber,
      source: 'self',
    });

    switch (result.status) {
      case 'invalid_event':
        return NextResponse.json(
          { code: 'invalid_event', detail: 'This event is not recognised.' },
          { status: 400 },
        );

      case 'email_collision_different_name':
        return NextResponse.json(
          {
            code: 'email_in_use',
            detail:
              'This email is already checked in under a different name. Please use a distinct email for each person.',
          },
          { status: 409 },
        );

      case 'at_capacity':
        return NextResponse.json(
          {
            code: 'at_capacity',
            detail:
              'This event has reached capacity. Please see an organiser — they can add you at the door.',
          },
          { status: 409 },
        );

      case 'already_checked_in':
        return NextResponse.json({
          ok: true,
          status: 'already_checked_in',
          dayIndex: result.dayIndex,
          message: `You're already checked in for Day ${result.dayIndex}. You're all set.`,
        });

      case 'checked_in':
        return NextResponse.json({
          ok: true,
          status: 'checked_in',
          dayIndex: result.dayIndex,
          message:
            result.dayIndex === 1
              ? "You're checked in for Day 1. Check your email for your CARSI login (it may take a little while)."
              : "You're checked in for Day 2. Thanks — your attendance is recorded.",
        });

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
