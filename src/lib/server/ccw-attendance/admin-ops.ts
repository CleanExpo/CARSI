/**
 * CCW/CARSI attendance foundation (unit A) — Stage 4 ADMIN OPS.
 *
 * Admin-only, single-event-scoped operations over captured sign-ins. Every
 * function here honours the two hard invariants of the foundation:
 *
 *  - The append-only `CcwRoadshowCheckInEvent` ledger is the regulatory source
 *    of truth. History is NEVER UPDATE'd or DELETE'd away. A correction is a new
 *    `reversal` row; the derived `day1/day2` cache is then RECOMPUTED from the
 *    full ledger via the pure `deriveDayColumns` replay.
 *  - Merging typo-duplicates re-parents the duplicate's ledger onto the survivor
 *    (custody moves; no checkin/reversal fact is lost) before the empty duplicate
 *    row is removed — so a merge can never erase attendance evidence.
 *
 * All mutating ops run in a SERIALIZABLE transaction so concurrent admin actions
 * and door writes cannot interleave into an inconsistent cache.
 *
 * Server-only. Never import into client code.
 */
import type { Prisma } from '@/generated/prisma/client';

import { prisma } from '@/lib/prisma';
import { runSerializable } from '@/lib/server/db-tx';

import {
  cecEligible,
  courseAccessGranted,
  getCcwWorkshopCourseSlug,
  type CcwSignInEligibilityInput,
} from './eligibility';
import { deriveDayColumns } from './ledger';
import { matchSignIn } from './match';
import { recordCheckIn, type RecordCheckInResult } from './checkin-service';
import type { CheckInDayIndex } from './checkin-token';

/**
 * Recompute a sign-in's derived day cache from its FULL append-only ledger and
 * persist it. Pure derivation (`deriveDayColumns`) + one guarded write; never
 * touches ledger rows.
 */
async function recomputeSignInDayColumns(
  tx: Prisma.TransactionClient,
  signInId: string,
): Promise<{ day1CheckedInAt: Date | null; day2CheckedInAt: Date | null }> {
  const events = await tx.ccwRoadshowCheckInEvent.findMany({
    where: { signInId },
    select: { dayIndex: true, action: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  const derived = deriveDayColumns(events);
  await tx.ccwRoadshowSignIn.update({
    where: { id: signInId },
    data: {
      day1CheckedInAt: derived.day1CheckedInAt,
      day2CheckedInAt: derived.day2CheckedInAt,
    },
  });
  return derived;
}

// ---------------------------------------------------------------------------
// Correction (append-only reversal)
// ---------------------------------------------------------------------------

export interface CorrectionInput {
  signInId: string;
  dayIndex: CheckInDayIndex;
  reason: string;
  /** AdminUser.id when available (ledger `actor_admin_id`, no FK). */
  actorAdminId?: string | null;
  /** Admin email — recorded in the ledger `reason` for a human-readable trail. */
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
 * Correct a day mark by APPENDING a `reversal` ledger row (with a mandatory
 * reason) and recomputing the derived cache. No existing row is ever mutated —
 * the reversal cancels the most recent check-in for that day on replay.
 */
export async function applyCheckInCorrection(input: CorrectionInput): Promise<CorrectionResult> {
  const reason = input.reason?.trim();
  if (!reason) return { status: 'invalid_reason' };

  return runSerializable(async (tx) => {
    const signIn = await tx.ccwRoadshowSignIn.findUnique({
      where: { id: input.signInId },
      select: { id: true },
    });
    if (!signIn) return { status: 'not_found' };

    await tx.ccwRoadshowCheckInEvent.create({
      data: {
        signInId: input.signInId,
        dayIndex: input.dayIndex,
        action: 'reversal',
        source: 'admin',
        actorAdminId: input.actorAdminId ?? null,
        reason: input.actorAdminEmail ? `${reason} (by ${input.actorAdminEmail})` : reason,
      },
    });

    const derived = await recomputeSignInDayColumns(tx, input.signInId);
    return { status: 'corrected', signInId: input.signInId, ...derived };
  });
}

// ---------------------------------------------------------------------------
// Merge duplicates (re-parent ledger, never delete history)
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
      movedEvents: number;
    }
  | { status: 'not_found' }
  | { status: 'same_row' }
  | { status: 'different_event' };

/**
 * Merge a typo-duplicate sign-in into a surviving primary row. The duplicate's
 * append-only ledger is RE-PARENTED onto the primary (custody move; every
 * checkin/reversal fact is preserved), then the now-childless duplicate is
 * removed and the primary's cache is recomputed from the combined ledger.
 *
 * NULL linkage/detail on the survivor is backfilled from the duplicate. The
 * duplicate is deleted BEFORE the survivor's `enrollmentId` is set so the
 * `@@unique([enrollmentId])` constraint is never transiently violated.
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

    // 1. Re-parent the duplicate's ledger onto the survivor (no fact is lost).
    const moved = await tx.ccwRoadshowCheckInEvent.updateMany({
      where: { signInId: input.duplicateId },
      data: { signInId: input.primaryId },
    });

    // 2. Remove the empty duplicate BEFORE re-homing its unique enrollmentId.
    await tx.ccwRoadshowSignIn.delete({ where: { id: input.duplicateId } });

    // 3. Backfill only NULL/empty fields on the survivor from the duplicate.
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
    if (
      (primary.businessName == null || primary.businessName === '') &&
      duplicate.businessName != null &&
      duplicate.businessName !== ''
    ) {
      data.businessName = duplicate.businessName;
      data.normalizedBusiness = duplicate.normalizedBusiness;
    }
    if (
      (primary.iicrcRegNumber == null || primary.iicrcRegNumber === '') &&
      duplicate.iicrcRegNumber != null &&
      duplicate.iicrcRegNumber !== ''
    ) {
      data.iicrcRegNumber = duplicate.iicrcRegNumber;
    }
    // If either row was a reconciled (registered) attendee, the survivor is too.
    if (!primary.isWalkIn || !duplicate.isWalkIn) {
      data.isWalkIn = false;
    }
    if (Object.keys(data).length > 0) {
      await tx.ccwRoadshowSignIn.update({ where: { id: input.primaryId }, data });
    }

    // 4. Recompute the survivor's cache from the combined ledger.
    const derived = await recomputeSignInDayColumns(tx, input.primaryId);
    return {
      status: 'merged',
      primaryId: input.primaryId,
      ...derived,
      movedEvents: moved.count,
    };
  });
}

// ---------------------------------------------------------------------------
// Paper digitisation (reuse the single door writer with source='paper')
// ---------------------------------------------------------------------------

export interface DigitisePaperInput {
  eventSlug: string;
  dayIndex: CheckInDayIndex;
  fullName: string;
  email: string;
  businessName?: string | null;
  iicrcRegNumber?: string | null;
  actorAdminId?: string | null;
}

/**
 * Digitise a paper/offline sign-in through the SAME capture writer as the door
 * path, tagged `source='paper'`. It shares every invariant (write-once day
 * marks, unique-email collision refusal, walk-in capacity, ledger append).
 */
export function digitisePaperCheckIn(input: DigitisePaperInput): Promise<RecordCheckInResult> {
  return recordCheckIn({
    eventSlug: input.eventSlug,
    dayIndex: input.dayIndex,
    fullName: input.fullName,
    email: input.email,
    businessName: input.businessName,
    iicrcRegNumber: input.iicrcRegNumber,
    source: 'paper',
    actorAdminId: input.actorAdminId ?? null,
  });
}

// ---------------------------------------------------------------------------
// Roster (single-event scope; derived from the ledger, not the cache)
// ---------------------------------------------------------------------------

export interface SignInRosterRow {
  signInId: string;
  eventSlug: string;
  fullName: string;
  businessName: string | null;
  email: string;
  /** CEC surface only — this admin roster, NEVER the general roadshow CSV. */
  iicrcRegNumber: string | null;
  registrationId: string | null;
  isWalkIn: boolean;
  provisionStatus: string;
  day1CheckedInAt: string | null;
  day2CheckedInAt: string | null;
  checkInCount: number;
  reversalCount: number;
  courseAccessGranted: boolean;
  cecEligible: boolean;
}

export interface SignInRoster {
  eventSlug: string;
  courseSlug: string;
  courseCecHours: number | null;
  rows: SignInRosterRow[];
}

/**
 * List the sign-ins for ONE event with day-state RE-DERIVED from each row's
 * append-only ledger (the cache is not trusted for a regulatory read). Scoped to
 * the given event only — no cross-event / global-PII view.
 */
export async function listSignInsForEvent(eventSlug: string): Promise<SignInRoster> {
  const rows = await prisma.ccwRoadshowSignIn.findMany({
    where: { eventSlug },
    orderBy: { createdAt: 'asc' },
    include: {
      checkInEvents: {
        select: { dayIndex: true, action: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  const courseSlug = getCcwWorkshopCourseSlug();
  const course = await prisma.lmsCourse.findUnique({
    where: { slug: courseSlug },
    select: { cecHours: true },
  });
  const courseCecHours = course?.cecHours ?? null;

  const mapped: SignInRosterRow[] = rows.map((row) => {
    const derived = deriveDayColumns(row.checkInEvents);
    const eligibilityInput: CcwSignInEligibilityInput = {
      day1CheckedInAt: derived.day1CheckedInAt,
      day2CheckedInAt: derived.day2CheckedInAt,
      iicrcRegNumber: row.iicrcRegNumber,
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
      iicrcRegNumber: row.iicrcRegNumber,
      registrationId: row.registrationId,
      isWalkIn: row.isWalkIn,
      provisionStatus: row.provisionStatus,
      day1CheckedInAt: derived.day1CheckedInAt ? derived.day1CheckedInAt.toISOString() : null,
      day2CheckedInAt: derived.day2CheckedInAt ? derived.day2CheckedInAt.toISOString() : null,
      checkInCount: row.checkInEvents.filter((e) => e.action === 'checkin').length,
      reversalCount: row.checkInEvents.filter((e) => e.action === 'reversal').length,
      courseAccessGranted: courseAccessGranted(eligibilityInput),
      cecEligible: cecEligible(eligibilityInput, courseCecHours),
    };
  });

  return { eventSlug, courseSlug, courseCecHours, rows: mapped };
}

/**
 * Surface possible typo-duplicate candidates for a sign-in within its event.
 * Since email is unique per event, candidates come from the business/name match
 * tiers — which are AMBIGUOUS by definition, so the result is only ever a list
 * for an admin to choose from (never an auto-merge).
 */
export async function findMergeCandidates(
  eventSlug: string,
  signInId: string,
): Promise<string[]> {
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
    others,
  );
  return result.autoTick ? [] : result.matches;
}
