/**
 * CCW/CARSI attendance foundation (unit A) — Stage 3 ASYNC provisioning batch.
 *
 * This is the DECOUPLED, admin-triggered path that turns captured Day-1 sign-ins
 * into real CARSI accounts + 2-day-course enrolments + a fire-and-forget welcome
 * email. It is deliberately NOT on the door-side check-in path: the DO→external
 * egress route 504s (§2 / §15 AC8), so account creation, enrolment and email must
 * never be awaited by the capture service. The door writes fast + local; this
 * batch runs afterwards.
 *
 * Reused primitives (verbatim, per §6 — do NOT reimplement):
 *  - `findOrCreateGuestUser` — HONOURS the P0-A guard: an `exists` outcome mints
 *    NO session and NEVER overwrites its password. Per §12/§10 (LOCKED, the
 *    authoritative security decision) an `exists` outcome is NOT silently
 *    attached/enrolled: a stranger typing an established account's email at the
 *    door must not bind, enrol, or CEC-credit that account. On `exists` this
 *    HALTS and quarantines the row as `needs_confirm`; the attach/enrol (and any
 *    IICRC# write) may proceed ONLY after emailed owner-confirmation — a
 *    follow-up unit (no confirm route/token exists yet). NOTE the spec is
 *    internally contradictory here (§9 says "exists -> link", §12/§10 require
 *    confirm-before-attach); the LOCKED §12 governs. A `created` account gets a
 *    random password NEVER surfaced to the operator or logs (access is delivered
 *    only via the emailed link).
 *  - `enrollStudentInCourse` — idempotent (`already_enrolled`).
 *  - `sendEnrollmentWelcomeEmail` — invoked fire-and-forget (`void … .catch`),
 *    never awaited.
 *
 * Resilience: each sign-in is provisioned independently inside its own try/catch;
 * one failing enrol/email must not abort the batch. A row is optimistically
 * claimed (`pending` → `provisioning`) so two concurrent batch runs cannot
 * double-provision the same person.
 */
import { getCcwWorkshopCourseSlug } from '@/lib/server/ccw-attendance/eligibility';
import { getAppOrigin } from '@/lib/server/app-url';
import { enrollStudentInCourse } from '@/lib/server/enrollment-service';
import { sendEnrollmentWelcomeEmail } from '@/lib/server/enrollment-email';
import { findOrCreateGuestUser } from '@/lib/server/guest-checkout';
import { sessionClaimsForUserId } from '@/lib/server/lms-auth';
import { prisma } from '@/lib/prisma';

import { finalizeCecForEvent, type FinalizeCecBatchSummary } from './cec';

/** Marks enrolments created by the workshop attendance foundation. */
export const CCW_ATTENDANCE_PAYMENT_REFERENCE = 'ccw:attendance';

export interface ProvisionOptions {
  /** AdminUser email that triggered the batch (audit trail; forwarded to CEC). */
  initiatedByAdminEmail?: string | null;
  /** Origin used to build welcome-email links; defaults to the app origin. */
  appOrigin?: string;
}

export type ProvisionSignInStatus =
  | 'provisioned'
  | 'skipped'
  | 'failed'
  /** Email maps to an EXISTING established account — quarantined pending emailed
   * owner-confirmation; NOT attached/enrolled/CEC-credited (§12/§10). */
  | 'needs_confirmation';

/** provisionStatus value written to a row awaiting owner-confirmation (≤16 chars). */
export const CCW_PROVISION_NEEDS_CONFIRM = 'needs_confirm';

export interface ProvisionSignInResult {
  signInId: string;
  status: ProvisionSignInStatus;
  studentId?: string;
  enrollmentId?: string;
  /** The `findOrCreateGuestUser` outcome for this row, when it ran. */
  accountOutcome?: 'created' | 'claimed' | 'exists';
  reason?: string;
}

export interface ProvisionBatchSummary {
  eventSlug: string;
  considered: number;
  provisioned: number;
  failed: number;
  skipped: number;
  /** Rows quarantined because the email maps to an existing established account. */
  needsConfirmation: number;
  results: ProvisionSignInResult[];
}

/**
 * Provision a single sign-in row. Idempotent and self-guarding: only a row still
 * in `pending` is claimed and processed; anything else returns `skipped`.
 * NEVER throws — failures are captured as a `failed` result so a batch can
 * continue.
 */
export async function provisionSignIn(
  signInId: string,
  options?: ProvisionOptions,
): Promise<ProvisionSignInResult> {
  // Optimistically claim the row so concurrent batch runs don't double-provision.
  const claim = await prisma.ccwRoadshowSignIn.updateMany({
    where: { id: signInId, provisionStatus: 'pending' },
    data: { provisionStatus: 'provisioning' },
  });
  if (claim.count === 0) {
    return { signInId, status: 'skipped', reason: 'not_pending' };
  }

  try {
    const signIn = await prisma.ccwRoadshowSignIn.findUnique({
      where: { id: signInId },
      select: {
        id: true,
        email: true,
        fullName: true,
        iicrcRegNumber: true,
      },
    });
    if (!signIn) {
      // Row vanished after the claim — nothing to do, leave no dangling state.
      return { signInId, status: 'skipped', reason: 'row_missing' };
    }

    // P0-A guard is inside findOrCreateGuestUser: no `allowClaim`, no password.
    // `exists` mutates nothing; `created` gets a random password we never read.
    const outcome = await findOrCreateGuestUser({
      email: signIn.email,
      fullName: signIn.fullName,
    });
    const accountOutcome = outcome.status;

    // SECURITY (§12/§10, LOCKED): an existing established CARSI account must NEVER
    // be silently attached, enrolled, or CEC-credited from a door-typed sign-in.
    // A stranger typing a victim's account email at the door must not bind the
    // sign-in to, enrol, write an IICRC# onto, or generate a regulatory CEC
    // submission against that victim's account. So on `exists` we HALT here and
    // quarantine the row as `needs_confirm` — no studentId/enrollmentId link, no
    // iicrcMemberNumber write, no enrolment, no welcome email, and CEC is never
    // reached (finalizeCec requires a non-null enrollmentId). The attach/enrol
    // may proceed only after emailed owner-confirmation, which is a follow-up
    // unit (no confirm route/token exists in the repo yet); until then these rows
    // surface in the admin roster for owner review. (§9 "exists -> link"
    // contradicts §12/§10 confirm-before-attach; the LOCKED §12 governs.)
    if (outcome.status === 'exists') {
      await markNeedsConfirmation(signInId);
      return {
        signInId,
        status: 'needs_confirmation',
        accountOutcome,
        reason: 'existing_account_needs_owner_confirmation',
      };
    }

    // Brand-new (`created`) or Stripe-claimed provisional (`claimed`) account only
    // from here — never an established account.
    const studentId = outcome.claims.sub;

    const claims = await sessionClaimsForUserId(studentId);
    if (!claims) {
      await markFailed(signInId);
      return { signInId, status: 'failed', accountOutcome, studentId, reason: 'inactive_account' };
    }

    // Write the IICRC# onto the student record ONLY when the account doesn't
    // already carry one — never clobber an established member's number with a
    // door-typed value. This is what the CEC pipeline reads later.
    const iicrc = signIn.iicrcRegNumber?.trim();
    if (iicrc) {
      await prisma.lmsUser.updateMany({
        where: { id: studentId, OR: [{ iicrcMemberNumber: null }, { iicrcMemberNumber: '' }] },
        data: { iicrcMemberNumber: iicrc },
      });
    }

    const slug = getCcwWorkshopCourseSlug();
    const enrolled = await enrollStudentInCourse(claims, slug, CCW_ATTENDANCE_PAYMENT_REFERENCE);

    let enrollmentId: string;
    if (enrolled === 'already_enrolled') {
      const course = await prisma.lmsCourse.findUnique({
        where: { slug },
        select: { id: true },
      });
      const existing = course
        ? await prisma.lmsEnrollment.findUnique({
            where: { studentId_courseId: { studentId, courseId: course.id } },
            select: { id: true },
          })
        : null;
      if (!existing) {
        await markFailed(signInId);
        return { signInId, status: 'failed', accountOutcome, studentId, reason: 'enrollment_not_found' };
      }
      enrollmentId = existing.id;
    } else {
      enrollmentId = enrolled.enrollmentId;
    }

    // Link the account + enrolment back onto the sign-in and mark provisioned.
    await prisma.ccwRoadshowSignIn.update({
      where: { id: signInId },
      data: { studentId, enrollmentId, provisionStatus: 'provisioned' },
    });

    // Fire-and-forget welcome email — NEVER awaited (DO→email egress 504s). The
    // email is the only channel that surfaces access (magic/reset link).
    const appOrigin = options?.appOrigin ?? getAppOrigin(null);
    void sendEnrollmentWelcomeEmail({ studentId, courseSlug: slug, appOrigin }).catch((e) =>
      console.error('[ccw-provision] welcome email', signInId, e),
    );

    return { signInId, status: 'provisioned', accountOutcome, studentId, enrollmentId };
  } catch (e) {
    console.error('[ccw-provision] row failed', signInId, e);
    await markFailed(signInId);
    return { signInId, status: 'failed', reason: 'exception' };
  }
}

async function markFailed(signInId: string): Promise<void> {
  await prisma.ccwRoadshowSignIn
    .updateMany({
      where: { id: signInId, provisionStatus: 'provisioning' },
      data: { provisionStatus: 'failed' },
    })
    .catch((e) => console.error('[ccw-provision] markFailed', signInId, e));
}

/**
 * Quarantine a row whose email maps to an existing established account. The row
 * is left with NO studentId/enrollmentId link (never attached) and moves out of
 * the `provisioning` claim into `needs_confirm`, so a re-run of the batch (which
 * only scans `pending`) will not retry it and CEC finalisation (which requires a
 * non-null enrollmentId) can never touch the victim's account.
 */
async function markNeedsConfirmation(signInId: string): Promise<void> {
  await prisma.ccwRoadshowSignIn
    .updateMany({
      where: { id: signInId, provisionStatus: 'provisioning' },
      data: { provisionStatus: CCW_PROVISION_NEEDS_CONFIRM },
    })
    .catch((e) => console.error('[ccw-provision] markNeedsConfirmation', signInId, e));
}

/**
 * Provision every still-pending Day-1 sign-in for one event. Sequential + fully
 * resilient — a single failing row is recorded and the batch continues.
 */
export async function provisionDay1SignIns(
  eventSlug: string,
  options?: ProvisionOptions,
): Promise<ProvisionBatchSummary> {
  const rows = await prisma.ccwRoadshowSignIn.findMany({
    where: { eventSlug, provisionStatus: 'pending', day1CheckedInAt: { not: null } },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });

  const results: ProvisionSignInResult[] = [];
  for (const row of rows) {
    results.push(await provisionSignIn(row.id, options));
  }

  return {
    eventSlug,
    considered: rows.length,
    provisioned: results.filter((r) => r.status === 'provisioned').length,
    failed: results.filter((r) => r.status === 'failed').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    needsConfirmation: results.filter((r) => r.status === 'needs_confirmation').length,
    results,
  };
}

export interface CcwAttendanceBatchSummary {
  provision: ProvisionBatchSummary;
  cec: FinalizeCecBatchSummary;
}

/**
 * The full admin-triggered async batch for an event: (1) provision pending
 * Day-1 sign-ins, then (2) finalise CEC for anyone now checked in BOTH days.
 * This is the single entry point the admin provision route calls.
 */
export async function runCcwAttendanceBatch(
  eventSlug: string,
  options?: ProvisionOptions,
): Promise<CcwAttendanceBatchSummary> {
  const provision = await provisionDay1SignIns(eventSlug, options);
  const cec = await finalizeCecForEvent(eventSlug, {
    initiatedByAdminEmail: options?.initiatedByAdminEmail ?? null,
  });
  return { provision, cec };
}
