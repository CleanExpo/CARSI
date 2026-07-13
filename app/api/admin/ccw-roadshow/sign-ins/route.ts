import { NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { getCcwRoadshowEvent } from '@/lib/marketing/ccw-roadshow';
import {
  applyCheckInCorrection,
  digitisePaperCheckIn,
  findMergeCandidates,
  listSignInsForEvent,
  mergeDuplicateSignIns,
} from '@/lib/server/ccw-attendance/admin-ops';
import { isCcwAttendanceEnabled } from '@/lib/server/ccw-attendance/flag';
import type { CheckInDayIndex } from '@/lib/server/ccw-attendance/checkin-token';

/**
 * Admin sign-in roster + correction/merge/paper-digitisation for ONE event.
 *
 * DARK behind `CCW_ATTENDANCE_ENABLED` (404 when off). Admin-only
 * (`getAdminSessionOrNull` → 401). Scoped to a single event — there is no
 * cross-event / global-PII view here.
 *
 * GET  ?eventSlug=<slug>          → { ok, roster }
 * POST { action: 'correct' | 'merge' | 'digitise_paper', ... }
 */

export const dynamic = 'force-dynamic';

function toDayIndex(value: unknown): CheckInDayIndex | null {
  return value === 1 ? 1 : value === 2 ? 2 : null;
}

export async function GET(request: NextRequest) {
  if (!isCcwAttendanceEnabled()) {
    return NextResponse.json({ detail: 'Not found' }, { status: 404 });
  }

  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  const event = getCcwRoadshowEvent(request.nextUrl.searchParams.get('eventSlug'));
  if (!event) {
    return NextResponse.json({ detail: 'A valid eventSlug is required.' }, { status: 400 });
  }

  // Optional: surface possible typo-duplicate candidates for one sign-in.
  const candidatesFor = request.nextUrl.searchParams.get('candidatesFor')?.trim();
  try {
    if (candidatesFor) {
      const candidates = await findMergeCandidates(event.slug, candidatesFor);
      return NextResponse.json({ ok: true, candidates });
    }
    const roster = await listSignInsForEvent(event.slug);
    return NextResponse.json({ ok: true, roster });
  } catch (e) {
    console.error('[ccw-roadshow/sign-ins] GET', e);
    return NextResponse.json({ detail: 'Failed to load sign-ins.' }, { status: 500 });
  }
}

type CorrectBody = {
  action: 'correct';
  signInId?: string;
  dayIndex?: number;
  reason?: string;
};
type MergeBody = {
  action: 'merge';
  primaryId?: string;
  duplicateId?: string;
  reason?: string;
};
type DigitisePaperBody = {
  action: 'digitise_paper';
  eventSlug?: string;
  dayIndex?: number;
  fullName?: string;
  email?: string;
  businessName?: string;
};
type PostBody = CorrectBody | MergeBody | DigitisePaperBody | { action?: string };

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

  const body = (await request.json().catch(() => ({}))) as PostBody;

  try {
    switch (body.action) {
      case 'correct': {
        const b = body as CorrectBody;
        const signInId = b.signInId?.trim();
        const dayIndex = toDayIndex(b.dayIndex);
        const reason = b.reason?.trim();
        if (!signInId || dayIndex == null || !reason) {
          return NextResponse.json(
            { detail: 'signInId, dayIndex (1 or 2) and a reason are required.' },
            { status: 400 },
          );
        }
        const result = await applyCheckInCorrection({
          signInId,
          dayIndex,
          reason,
          actorAdminEmail: session.email,
        });
        if (result.status === 'not_found') {
          return NextResponse.json({ detail: 'Sign-in not found.' }, { status: 404 });
        }
        if (result.status === 'invalid_reason') {
          return NextResponse.json({ detail: 'A reason is required.' }, { status: 400 });
        }
        return NextResponse.json({ ok: true, result });
      }

      case 'merge': {
        const b = body as MergeBody;
        const primaryId = b.primaryId?.trim();
        const duplicateId = b.duplicateId?.trim();
        if (!primaryId || !duplicateId) {
          return NextResponse.json(
            { detail: 'primaryId and duplicateId are required.' },
            { status: 400 },
          );
        }
        const result = await mergeDuplicateSignIns({
          primaryId,
          duplicateId,
          actorAdminEmail: session.email,
          reason: b.reason?.trim() || null,
        });
        if (result.status === 'same_row') {
          return NextResponse.json(
            { detail: 'Cannot merge a sign-in into itself.' },
            { status: 400 },
          );
        }
        if (result.status === 'not_found') {
          return NextResponse.json({ detail: 'One of the sign-ins was not found.' }, { status: 404 });
        }
        if (result.status === 'different_event') {
          return NextResponse.json(
            { detail: 'Sign-ins from different events cannot be merged.' },
            { status: 400 },
          );
        }
        return NextResponse.json({ ok: true, result });
      }

      case 'digitise_paper': {
        const b = body as DigitisePaperBody;
        const event = getCcwRoadshowEvent(b.eventSlug);
        const dayIndex = toDayIndex(b.dayIndex);
        const fullName = b.fullName?.trim() ?? '';
        const email = b.email?.trim() ?? '';
        const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        if (!event || dayIndex == null || !fullName || !emailValid) {
          return NextResponse.json(
            { detail: 'A valid eventSlug, dayIndex (1 or 2), full name and email are required.' },
            { status: 400 },
          );
        }
        const result = await digitisePaperCheckIn({
          eventSlug: event.slug,
          dayIndex,
          fullName,
          email,
          businessName: b.businessName,
        });
        switch (result.status) {
          case 'email_collision_different_name':
            return NextResponse.json(
              {
                code: 'email_in_use',
                detail:
                  'This email is already checked in under a different name. Use a distinct email for each person.',
              },
              { status: 409 },
            );
          case 'at_capacity':
            return NextResponse.json(
              { code: 'at_capacity', detail: 'This event is at capacity.' },
              { status: 409 },
            );
          case 'invalid_event':
            return NextResponse.json(
              { code: 'invalid_event', detail: 'This event is not recognised.' },
              { status: 400 },
            );
          default:
            return NextResponse.json({ ok: true, result });
        }
      }

      default:
        return NextResponse.json({ detail: 'Unknown action.' }, { status: 400 });
    }
  } catch (e) {
    console.error('[ccw-roadshow/sign-ins] POST', e);
    return NextResponse.json({ detail: 'Sign-in action failed.' }, { status: 500 });
  }
}
