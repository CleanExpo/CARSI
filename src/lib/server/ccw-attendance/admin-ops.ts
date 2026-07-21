/**
 * CCW/CARSI attendance foundation (unit A) — Stage 4 ADMIN OPS.
 *
 * Admin-only, single-event-scoped operations over captured sign-ins.
 *
 * The `day1CheckedInAt` / `day2CheckedInAt` columns on `CcwRoadshowSignIn` are the
 * WRITE-ONCE source of truth for attendance. The door path only ever sets them
 * (set-if-null); admin corrections here are the sole path allowed to clear a
 * mistaken mark — a direct, write-once-respecting update (there is no append-only
 * ledger; this course grants no CECs, so the regulatory audit ledger is gone).
 *
 * Merging typo-duplicates backfills the survivor from the duplicate (linkage,
 * detail, and any day mark the survivor is missing) before the empty duplicate
 * row is removed — so a merge can never erase attendance evidence.
 *
 * All mutating ops run in a SERIALIZABLE transaction so concurrent admin actions
 * and door writes cannot interleave into an inconsistent state.
 *
 * Server-only. Never import into client code.
 */
import type { Prisma } from '@/generated/prisma/client';

import { prisma } from '@/lib/prisma';
import { runSerializable } from '@/lib/server/db-tx';

import {
  attendanceComplete,
  courseAccessGranted,
  getCcwWorkshopCourseSlug,
  type CcwSignInEligibilityInput,
} from './eligibility';
import { matchSignIn } from './match';
import { recordCheckIn, type RecordCheckInResult } from './checkin-service';
import type { CheckInDayIndex } from './checkin-token';

// ---------------------------------------------------------------------------
// Correction (direct, write-once-respecting clear of a day mark)
// ---------------------------------------------------------------------------

export interface CorrectionInput {
  signInId: string;
  dayIndex: CheckInDayIndex;
  reason: string;
  /** AdminUser.id when available (recorded in the app log). */
  actorAdminId?: string | null;
  /** Admin email — recorded in the app log for a human-readable trail. */
  actorAdminEmail?: string | null;
}

export type CorrectionResult =
  | {
      status: 'corrected';
      signInId: string;
      day1CheckedInAt: Date | null;
      day2CheckedInAt: Date | null;
    }
  | { status: 'not_found' }
  | { status: 'invalid_reason' };

/**
 * Correct a day mark by CLEARING it (a mistaken check-in) with a mandatory
 * reason. This is the only path allowed to un-set a write-once day column; the
 * door path can only ever set-if-null. The reason + actor are recorded in the
 * application log (there is no ledger table).
 */
export async function applyCheckInCorrection(input: CorrectionInput): Promise<CorrectionResult> {
  const reason = input.reason?.trim();
  if (!reason) return { status: 'invalid_reason' };

  const dayField = input.dayIndex === 1 ? 'day1CheckedInAt' : 'day2CheckedInAt';

  return runSerializable(async (tx) => {
    const signIn = await tx.ccwRoadshowSignIn.findUnique({
      where: { id: input.signInId },
      select: { id: true },
    });
    if (!signIn) return { status: 'not_found' };

    const updated = await tx.ccwRoadshowSignIn.update({
      where: { id: input.signInId },
      data: { [dayField]: null },
      select: { day1CheckedInAt: true, day2CheckedInAt: true },
    });

    console.info(
      '[ccw-correction]',
      input.signInId,
      `day${input.dayIndex}`,
      input.actorAdminEmail ? `by ${input.actorAdminEmail}` : '',
      reason
    );

    return {
      status: 'corrected',
      signInId: input.signInId,
      day1CheckedInAt: updated.day1CheckedInAt,
      day2CheckedInAt: updated.day2CheckedInAt,
    };
  });
}

// ---------------------------------------------------------------------------
// Merge duplicates (backfill survivor, never lose an attendance mark)
// ---------------------------------------------------------------------------

export interface MergeInput {
  primaryId: string;
  duplicateId: string;
  actorAdminId?: string | null;
  actorAdminEmail?: string | null;
  reason?: string | null;
}

export type MergeResult =
  | {
      status: 'merged';
      primaryId: string;
      day1CheckedInAt: Date | null;
      day2CheckedInAt: Date | null;
    }
  | { status: 'not_found' }
  | { status: 'same_row' }
  | { status: 'different_event' };

/**
 * Merge a typo-duplicate sign-in into a surviving primary row. Any attendance
 * mark, linkage, or detail the survivor is MISSING is backfilled from the
 * duplicate, so no attendance evidence is lost; the survivor keeps its own value
 * where it already has one. The duplicate is deleted BEFORE the survivor's
 * `enrollmentId` is set so the `@@unique([enrollmentId])` constraint is never
 * transiently violated.
 */
export async function mergeDuplicateSignIns(input: MergeInput): Promise<MergeResult> {
  if (input.primaryId === input.duplicateId) return { status: 'same_row' };

  return runSerializable(async (tx) => {
    const [primary, duplicate] = await Promise.all([
      tx.ccwRoadshowSignIn.findUnique({ where: { id: input.primaryId } }),
      tx.ccwRoadshowSignIn.findUnique({ where: { id: input.duplicateId } }),
    ]);
    if (!primary || !duplicate) return { status: 'not_found' };
    if (primary.eventSlug !== duplicate.eventSlug) return { status: 'different_event' };

    // Remove the empty duplicate BEFORE re-homing its unique enrollmentId.
    await tx.ccwRoadshowSignIn.delete({ where: { id: input.duplicateId } });

    // Backfill only NULL/empty fields on the survivor from the duplicate.
    const data: Prisma.CcwRoadshowSignInUncheckedUpdateInput = {};
    if (primary.registrationId == null && duplicate.registrationId != null) {
      data.registrationId = duplicate.registrationId;
    }
    if (primary.studentId == null && duplicate.studentId != null) {
      data.studentId = duplicate.studentId;
    }
    if (primary.enrollmentId == null && duplicate.enrollmentId != null) {
      data.enrollmentId = duplicate.enrollmentId;
    }
    // Never lose an attendance mark: fill a missing day from the duplicate.
    const day1CheckedInAt = primary.day1CheckedInAt ?? duplicate.day1CheckedInAt;
    const day2CheckedInAt = primary.day2CheckedInAt ?? duplicate.day2CheckedInAt;
    if (primary.day1CheckedInAt == null && duplicate.day1CheckedInAt != null) {
      data.day1CheckedInAt = duplicate.day1CheckedInAt;
    }
    if (primary.day2CheckedInAt == null && duplicate.day2CheckedInAt != null) {
      data.day2CheckedInAt = duplicate.day2CheckedInAt;
    }
    if (
      (primary.businessName == null || primary.businessName === '') &&
      duplicate.businessName != null &&
      duplicate.businessName !== ''
    ) {
      data.businessName = duplicate.businessName;
      data.normalizedBusiness = duplicate.normalizedBusiness;
    }
    // If either row was a reconciled (registered) attendee, the survivor is too.
    if (!primary.isWalkIn || !duplicate.isWalkIn) {
      data.isWalkIn = false;
    }
    if (Object.keys(data).length > 0) {
      await tx.ccwRoadshowSignIn.update({ where: { id: input.primaryId }, data });
    }

    return {
      status: 'merged',
      primaryId: input.primaryId,
      day1CheckedInAt,
      day2CheckedInAt,
    };
  });
}

// ---------------------------------------------------------------------------
// Assisted electronic check-in (reuse the single door writer with source='admin')
// ---------------------------------------------------------------------------

export interface AdminCheckInInput {
  eventSlug: string;
  dayIndex: CheckInDayIndex;
  fullName: string;
  email: string;
  businessName?: string | null;
  actorAdminId?: string | null;
  actorAdminEmail?: string | null;
}

/**
 * Record an organiser-assisted electronic sign-in through the SAME capture
 * writer as the attendee path, tagged `source='admin'`. It shares every invariant (write-once day
 * marks, unique-email collision refusal, walk-in capacity).
 */
export async function recordAdminCheckIn(input: AdminCheckInInput): Promise<RecordCheckInResult> {
  const result = await recordCheckIn({
    eventSlug: input.eventSlug,
    dayIndex: input.dayIndex,
    fullName: input.fullName,
    email: input.email,
    businessName: input.businessName,
    source: 'admin',
    actorAdminId: input.actorAdminId ?? null,
  });
  console.info(
    '[ccw-admin-checkin]',
    input.eventSlug,
    `day${input.dayIndex}`,
    input.actorAdminEmail ? `by ${input.actorAdminEmail}` : '',
    result.status
  );
  return result;
}

// ---------------------------------------------------------------------------
// Roster (single-event scope)
// ---------------------------------------------------------------------------

export interface SignInRosterRow {
  signInId: string;
  eventSlug: string;
  fullName: string;
  businessName: string | null;
  email: string;
  registrationId: string | null;
  isWalkIn: boolean;
  provisionStatus: string;
  day1CheckedInAt: string | null;
  day2CheckedInAt: string | null;
  courseAccessGranted: boolean;
  /** Both days done → certificate of attendance issued by the async batch. */
  attendanceComplete: boolean;
}

export interface SignInRoster {
  eventSlug: string;
  courseSlug: string;
  rows: SignInRosterRow[];
}

/**
 * List the sign-ins for ONE event. Scoped to the given event only — no
 * cross-event / global-PII view. Day-state is read directly from the write-once
 * day columns (the source of truth).
 */
export async function listSignInsForEvent(eventSlug: string): Promise<SignInRoster> {
  const rows = await prisma.ccwRoadshowSignIn.findMany({
    where: { eventSlug },
    orderBy: { createdAt: 'asc' },
  });

  const courseSlug = getCcwWorkshopCourseSlug();

  const mapped: SignInRosterRow[] = rows.map((row) => {
    const eligibilityInput: CcwSignInEligibilityInput = {
      day1CheckedInAt: row.day1CheckedInAt,
      day2CheckedInAt: row.day2CheckedInAt,
      studentId: row.studentId,
      enrollmentId: row.enrollmentId,
      provisionStatus: row.provisionStatus,
    };
    return {
      signInId: row.id,
      eventSlug: row.eventSlug,
      fullName: row.fullName,
      businessName: row.businessName,
      email: row.email,
      registrationId: row.registrationId,
      isWalkIn: row.isWalkIn,
      provisionStatus: row.provisionStatus,
      day1CheckedInAt: row.day1CheckedInAt ? row.day1CheckedInAt.toISOString() : null,
      day2CheckedInAt: row.day2CheckedInAt ? row.day2CheckedInAt.toISOString() : null,
      courseAccessGranted: courseAccessGranted(eligibilityInput),
      attendanceComplete: attendanceComplete(eligibilityInput),
    };
  });

  return { eventSlug, courseSlug, rows: mapped };
}

/**
 * Surface possible typo-duplicate candidates for a sign-in within its event.
 * Since email is unique per event, candidates come from the business/name match
 * tiers — which are AMBIGUOUS by definition, so the result is only ever a list
 * for an admin to choose from (never an auto-merge).
 */
export async function findMergeCandidates(eventSlug: string, signInId: string): Promise<string[]> {
  const target = await prisma.ccwRoadshowSignIn.findUnique({
    where: { id: signInId },
    select: { id: true, eventSlug: true, businessName: true, fullName: true },
  });
  if (!target || target.eventSlug !== eventSlug) return [];

  const others = await prisma.ccwRoadshowSignIn.findMany({
    where: { eventSlug, id: { not: signInId } },
    select: { id: true, normalizedEmail: true, normalizedBusiness: true, normalizedName: true },
  });

  const result = matchSignIn(
    { businessName: target.businessName, fullName: target.fullName },
    others
  );
  return result.autoTick ? [] : result.matches;
}
