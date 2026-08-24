import { NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { getAppOrigin } from '@/lib/server/app-url';
import { isCcwAttendanceEnabled } from '@/lib/server/ccw-attendance/flag';
import {
  attendeeMembershipRateAud,
  compAttendeeMembership,
} from '@/lib/server/ccw-attendance/comp-membership';

/**
 * POST /api/admin/ccw-roadshow/comp-membership — grant ONE named roadshow
 * attendee a year of CARSI membership. Admin-only; dark behind
 * CCW_ATTENDANCE_ENABLED, matching its sibling admin roadshow routes.
 *
 * Body: { signInId: string, pricingMode?: 'attendee_rate' | 'free' | 'custom',
 *         priceAud?: number }
 *
 * This is the ADMIN half of the `carsi-membership` offer. The self-serve half
 * stays a discounted Stripe subscription ($295 first year, then $795) — see
 * `@/lib/server/ccw-attendance/comp-membership` for why the two instruments must
 * not be swapped for one another.
 */
export async function POST(request: NextRequest) {
  if (!isCcwAttendanceEnabled()) {
    return NextResponse.json({ detail: 'Not found' }, { status: 404 });
  }

  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return NextResponse.json({ detail: 'Expected application/json' }, { status: 415 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  // `request.json()` RESOLVES with null for a literal `null` body, so `.catch`
  // never runs and the field reads below would throw before any validation.
  const body = ((await request.json().catch(() => ({}))) ?? {}) as {
    signInId?: string;
    pricingMode?: string;
    priceAud?: unknown;
  };

  const signInId = typeof body.signInId === 'string' ? body.signInId.trim() : '';
  if (!signInId) {
    return NextResponse.json({ detail: 'A signInId is required.' }, { status: 400 });
  }

  // Default to the configured attendee rate rather than to free: a comp that
  // silently records $0 when the operator meant the event rate misstates what
  // was collected, and that figure is the one the offer itself advertises.
  const priceAud = resolvePriceAud(body.pricingMode, body.priceAud);
  if (priceAud === null) {
    return NextResponse.json(
      {
        detail:
          'Enter a valid lump-sum price (AUD), or choose “free”. The attendee rate is not configured on the offer.',
      },
      { status: 400 },
    );
  }

  try {
    const outcome = await compAttendeeMembership({
      signInId,
      priceAud,
      appOrigin: getAppOrigin(request),
    });

    if (!outcome.ok) {
      return NextResponse.json({ detail: refusalDetail(outcome.reason) }, { status: statusFor(outcome.reason) });
    }

    return NextResponse.json({ ok: true, ...outcome.result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'INVALID_EMAIL') {
      return NextResponse.json({ detail: 'That attendee has an invalid email address.' }, { status: 400 });
    }
    if (msg === 'INVALID_PRICE') {
      return NextResponse.json({ detail: 'Invalid price' }, { status: 400 });
    }
    if (msg === 'NO_PUBLISHED_COURSES') {
      return NextResponse.json(
        { detail: 'No published courses in the catalogue to grant' },
        { status: 400 },
      );
    }
    if (msg === 'ENROLLMENT_FAILED') {
      return NextResponse.json(
        { detail: 'Could not enrol the attendee in any course' },
        { status: 500 },
      );
    }
    console.error('[ccw-roadshow/comp-membership]', e);
    return NextResponse.json({ detail: 'Failed to comp the membership' }, { status: 500 });
  }
}

/** `null` = the request named a price we will not act on. */
function resolvePriceAud(pricingMode: unknown, raw: unknown): number | null {
  if (pricingMode === 'free') return 0;

  if (pricingMode === 'custom') {
    const value =
      typeof raw === 'number' ? raw : typeof raw === 'string' ? Number.parseFloat(raw) : Number.NaN;
    if (!Number.isFinite(value) || value < 0) return null;
    return value;
  }

  // Default, and the explicit 'attendee_rate' mode. A missing configured rate is
  // NOT free — silently recording $0 when the operator asked for the event rate
  // misstates what was collected, so it takes the 400 path instead.
  return attendeeMembershipRateAud();
}

function refusalDetail(reason: string): string {
  switch (reason) {
    case 'not_found':
      return 'No attendee sign-in with that id.';
    case 'not_offer_eligible':
      return 'This offer is for attendees who completed both days, opted in to email, and have been provisioned.';
    case 'already_a_member':
      return 'That attendee already holds an active CARSI membership.';
    case 'already_comped':
      return 'That attendee has already been granted a yearly membership.';
    case 'checkout_in_progress':
      return 'That attendee has a membership checkout open right now. Wait for it to finish, or cancel it, before comping.';
    default:
      return 'We could not confirm the attendee’s membership status. Please try again shortly.';
  }
}

function statusFor(reason: string): number {
  switch (reason) {
    case 'not_found':
      return 404;
    case 'not_offer_eligible':
      return 403;
    case 'already_a_member':
    case 'already_comped':
    case 'checkout_in_progress':
      return 409;
    default:
      return 503;
  }
}
