/**
 * CCW/CARSI attendance foundation (unit A) — CAPTURE service (the door write).
 *
 * The ONLY place that writes a sign-in. Kept deliberately local + fast: it
 * performs NO external I/O (no provisioning, no enrolment, no email — those are
 * the async Stage-3 batch). The DO→external egress path 504s (§2/§15 AC8), so
 * the door write must never await it.
 *
 * Invariants enforced here (all from §12 / §15):
 *  - UNIQUE email per event. A second person on the same email but a DIFFERENT
 *    normalized name is refused (`email_collision_different_name`) — never
 *    collapsed, never overwritten.
 *  - Day marks are WRITE-ONCE (set-if-null) — the source of truth for attendance.
 *    A re-tap on an already-marked day is idempotent (`already_checked_in`).
 *  - Reconcile-by-email against an existing confirmed registration links the
 *    sign-in (not a walk-in). No email match ⇒ walk-in.
 *  - WALK-INS CONSUME CAPACITY: a walk-in is refused (`at_capacity`) once
 *    confirmed-registration seats + existing walk-ins reach the event cap. A
 *    reconciled (registered) attendee already holds a reserved seat and is never
 *    capacity-checked.
 *
 * Concurrency: runs in a SERIALIZABLE transaction (`runSerializable`) so two
 * simultaneous walk-ins cannot both commit past the cap and two writers on the
 * same email cannot both create.
 */
import type { Prisma } from '@/generated/prisma/client';

import { getCcwRoadshowEvent } from '@/lib/marketing/ccw-roadshow';
import { runSerializable } from '@/lib/server/db-tx';

import { normalizeBusiness, normalizeEmail, normalizeName } from './normalize';
import type { CheckInDayIndex } from './checkin-token';

/** Where the electronic check-in came from (self-service QR or admin assistance). */
export type CheckInSource = 'self' | 'admin';

export interface RecordCheckInInput {
  eventSlug: string;
  dayIndex: CheckInDayIndex;
  fullName: string;
  email: string;
  businessName?: string | null;
  /** Defaults to 'self' (the QR/own-device path). */
  source?: CheckInSource;
  /** AdminUser.id when an admin performed/digitised this action. */
  actorAdminId?: string | null;
}

export type RecordCheckInResult =
  | {
      status: 'checked_in';
      signInId: string;
      dayIndex: CheckInDayIndex;
      created: boolean;
      isWalkIn: boolean;
      reconciledRegistration: boolean;
    }
  | {
      status: 'already_checked_in';
      signInId: string;
      dayIndex: CheckInDayIndex;
      isWalkIn: boolean;
    }
  | { status: 'email_collision_different_name' }
  | { status: 'at_capacity'; capacity: number }
  | { status: 'invalid_event' };

/**
 * Capacity already consumed for an event: confirmed-registration seats (each
 * reserves a seat) plus existing walk-in sign-ins (extra bodies not covered by
 * any registration). Reconciled sign-ins are NOT added — their seat is already
 * counted inside the registration's `seatCount`.
 */
async function capacityUsed(tx: Prisma.TransactionClient, eventSlug: string): Promise<number> {
  const seats = await tx.ccwRoadshowRegistration.aggregate({
    _sum: { seatCount: true },
    where: { eventSlug, status: 'confirmed' },
  });
  const walkIns = await tx.ccwRoadshowSignIn.count({
    where: { eventSlug, isWalkIn: true },
  });
  return (seats._sum.seatCount ?? 0) + walkIns;
}

/**
 * Reconcile a new sign-in to an existing confirmed registration by normalized
 * email. Registration counts are tiny (≤ event cap), so we match in JS with the
 * SAME `normalizeEmail` helper used on the write path — never an inline compare.
 */
async function findRegistrationIdByEmail(
  tx: Prisma.TransactionClient,
  eventSlug: string,
  normalizedEmail: string
): Promise<string | null> {
  const regs = await tx.ccwRoadshowRegistration.findMany({
    where: { eventSlug, status: 'confirmed' },
    select: { id: true, contactEmail: true },
  });
  const match = regs.find((r) => normalizeEmail(r.contactEmail) === normalizedEmail);
  return match?.id ?? null;
}

/**
 * Record a single check-in. Pure DB work only — provisioning/enrolment/email
 * are Stage-3 async and must NOT be invoked here.
 */
export async function recordCheckIn(input: RecordCheckInInput): Promise<RecordCheckInResult> {
  const event = getCcwRoadshowEvent(input.eventSlug);
  if (!event) return { status: 'invalid_event' };

  const email = input.email.trim();
  const normalizedEmail = normalizeEmail(email);
  const fullName = input.fullName.trim();
  const normalizedName = normalizeName(fullName);
  const businessName = input.businessName?.trim() || null;
  const normalizedBusiness = businessName ? normalizeBusiness(businessName) || null : null;
  const source: CheckInSource = input.source ?? 'self';
  const dayField = input.dayIndex === 1 ? 'day1CheckedInAt' : 'day2CheckedInAt';

  return runSerializable(async (tx) => {
    const existing = await tx.ccwRoadshowSignIn.findUnique({
      where: {
        eventSlug_normalizedEmail: { eventSlug: event.slug, normalizedEmail },
      },
    });

    if (existing) {
      // UNIQUE email is the login identity. A different person on the same email
      // must NOT collapse into this row — refuse and demand a distinct email.
      if (existing.normalizedName !== normalizedName) {
        return { status: 'email_collision_different_name' };
      }

      const alreadyMarked =
        input.dayIndex === 1 ? existing.day1CheckedInAt : existing.day2CheckedInAt;
      if (alreadyMarked) {
        return {
          status: 'already_checked_in',
          signInId: existing.id,
          dayIndex: input.dayIndex,
          isWalkIn: existing.isWalkIn,
        };
      }

      // Write-once: set this day mark (it was null).
      const now = new Date();
      await tx.ccwRoadshowSignIn.update({
        where: { id: existing.id },
        data: { [dayField]: now },
      });
      return {
        status: 'checked_in',
        signInId: existing.id,
        dayIndex: input.dayIndex,
        created: false,
        isWalkIn: existing.isWalkIn,
        reconciledRegistration: existing.registrationId != null,
      };
    }

    // New person this event — reconcile against a confirmed registration.
    const registrationId = await findRegistrationIdByEmail(tx, event.slug, normalizedEmail);
    const isWalkIn = registrationId == null;

    // Walk-ins consume capacity; a reconciled attendee already holds a seat.
    if (isWalkIn) {
      const used = await capacityUsed(tx, event.slug);
      if (used >= event.capacity) {
        return { status: 'at_capacity', capacity: event.capacity };
      }
    }

    const now = new Date();
    const created = await tx.ccwRoadshowSignIn.create({
      data: {
        eventSlug: event.slug,
        registrationId,
        fullName,
        businessName,
        email,
        normalizedEmail,
        normalizedBusiness,
        normalizedName,
        isWalkIn,
        provisionStatus: 'pending',
        signedInByAdmin: source === 'self' ? null : (input.actorAdminId ?? null),
        [dayField]: now,
      },
    });

    return {
      status: 'checked_in',
      signInId: created.id,
      dayIndex: input.dayIndex,
      created: true,
      isWalkIn,
      reconciledRegistration: !isWalkIn,
    };
  });
}
