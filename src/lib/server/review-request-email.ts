/**
 * Review-request email (spec 2026-10-18 D9-D11, D16, D17; header amendment 6). DORMANT BY DEFAULT.
 *
 * One email, a few days after a learner completes a course, asking every completer the same
 * thing: tell other technicians what the course was like, in your own words. No reward, no
 * suggested text, no rating screen (ACCC online-review guidance). It is a commercial electronic
 * message under the Spam Act 2003, so opt-out is re-read right before each send and every
 * message carries one-click unsubscribe headers plus a visible unsubscribe link.
 *
 * ELIGIBILITY IS DECIDED AT COMPLETION, IN THE DATABASE (release-gate review r4). The trigger
 * `trg_lms_enrollments_review_request_eligibility` marks an enrolment's ledger row 'eligible' the
 * moment completed_at is first set, and only if lms_review_request_settings.enabled is true at that
 * instant. That covers every completion path (online, CCW provisioning, admin, scripts, SQL). This
 * job sends only rows marked eligible, and only while the same switch is on. A completion while
 * the switch is off has no row, so no cron cadence and no off/on sequence can ever backfill it.
 * The switch is created OFF; no scheduler ships with this code (sending stays Phill's decision).
 *
 * "At most once per enrolment" is enforced by the UNIQUE `enrollment_id` on
 * lms_review_request_emails. A run claims the row (pending + claim token) before sending; a row
 * becomes `sent` only when the provider actually accepted the message.
 *
 * Failures are split by what we know:
 * - DEFINITE (provider 4xx, not configured, dev console with no provider reply): nothing was
 *   delivered, so the row is `failed` and a later run retries it (max 3 attempts).
 * - AMBIGUOUS (5xx, network error or timeout, a throw, or a claim interrupted after
 *   `send_attempted_at` was set): the provider may have delivered it. The row becomes `ambiguous`
 *   and is NEVER resent automatically, because a duplicate breaks "at most once".
 * A claim interrupted before any send attempt is recovered by a later run once its lease expires.
 */

import { randomUUID } from 'node:crypto';

import { getAppOrigin } from '@/lib/server/app-url';
import { buildCarsiEmailHtml, brandLink, type RenderedEmail } from '@/lib/server/email-templates';
import { buildUnsubscribeUrl } from '@/lib/server/email-preferences';
import { isEmailConfigured, sendEmail, type SendEmailParams, type SendEmailResult } from '@/lib/server/email';
import { isOnboardingCourse } from '@/lib/onboarding/enterprise';
import { signEmailUnsubscribeToken } from '@/lib/auth/session-jwt';
import { requireCurrentAdmin, type AdminSessionProvenance, type CurrentAdmin } from '@/lib/server/current-admin';
import { prisma } from '@/lib/prisma';

const DAY_MS = 86_400_000;
/** Ask a few days after completion, once the learner has had time to use what they learnt. */
export const REVIEW_REQUEST_MIN_AGE_DAYS = 3;
/** Eligible completions older than this are never emailed; a missed daily run loses nobody. */
export const REVIEW_REQUEST_MAX_AGE_DAYS = 14;
/** Upper bound on sends per run; the next daily run continues from the oldest unsent. */
export const REVIEW_REQUEST_MAX_SENDS_PER_RUN = 50;
/** A failed send is retried on later runs up to this many attempts in total. */
export const REVIEW_REQUEST_MAX_ATTEMPTS = 3;
/** A pending claim older than this was interrupted and may be recovered (a full run takes under 15 min). */
export const REVIEW_REQUEST_CLAIM_LEASE_MINUTES = 30;
/** Candidate rows read per page; pages continue until the send cap or the window is exhausted. */
const PAGE_SIZE = 200;
const MAX_PAGES = 25;

/**
 * The review-request switch, read from the same row the completion trigger reads. A missing row
 * (a broken migration) reads as OFF and is reported, never treated as on.
 */
export async function readReviewRequestSettings(): Promise<{ enabled: boolean; missing: boolean }> {
  const row = await prisma.lmsReviewRequestSettings.findUnique({ where: { id: 1 }, select: { enabled: true } });
  return { enabled: row?.enabled === true, missing: row === null };
}

/** The admin who changed the switch: the shared current-admin record (current-admin.ts). */
export type ReviewRequestSwitchActor = CurrentAdmin;

/**
 * The switch's FAIR lock (release-gate r7). Row locks let later FOR SHARE readers overtake a waiting
 * FOR UPDATE, so another run's next send could start ahead of an OFF that is waiting for the
 * current send. PostgreSQL queues heavyweight (advisory) lock requests in order: once a switch
 * change is waiting for this lock in exclusive mode, every later send waits behind it, so the
 * change commits before any further send's locked checks run. Sends take it shared (first, before
 * any row lock); switch changes take it exclusive. Two int4 keys: 'CARS' and 1.
 */
const SWITCH_LOCK_CLASS = 0x43415253;
const SWITCH_LOCK_ID = 1;
/**
 * The global send mutex (release-gate r8): at most ONE review-request send transaction — the only
 * kind that holds a connection through a provider call — exists at a time, across every overlapping
 * cron run. A run that finds it taken stops (the other run is sending) and leaves its row eligible.
 * So overlapping runs can never fill the connection pool and starve a switch change.
 */
const SEND_MUTEX_ID = 2;

/**
 * Each locked statement in a send waits at most this long for a conflicting writer; the send then
 * fails before the provider call and is retried next run. Worst-case lock hold for one send is
 * therefore its transaction limit plus one such wait (20 s + 2 s), under the switch's 25 s wait.
 */
export const REVIEW_REQUEST_SEND_LOCK_TIMEOUT_MS = 2_000;
/** PostgreSQL ends a send transaction left idle this long (a frozen or killed runner), releasing its locks. */
export const REVIEW_REQUEST_SEND_IDLE_TIMEOUT_MS = 15_000;
/**
 * How long a switch change waits for in-flight sends. A send holds its locks for at most its
 * transaction limit (REVIEW_REQUEST_SEND_TRANSACTION_TIMEOUT_MS), so this is that plus margin.
 */
export const REVIEW_REQUEST_SWITCH_LOCK_TIMEOUT_MS = 25_000;
/** The switch change's own transaction limit. Prisma's 5 s default would expire behind one slow send (r7). */
export const REVIEW_REQUEST_SWITCH_TRANSACTION_TIMEOUT_MS = 30_000;

/**
 * How long a switch change waits for a database connection (release-gate r8). Sends are serial
 * (REVIEW_REQUEST_SEND_MUTEX: at most one send transaction holds a connection through a provider
 * call, everywhere), so the pool always has room; this bounds the wait if other traffic fills it.
 */
export const REVIEW_REQUEST_SWITCH_CONNECTION_WAIT_MS = 10_000;

/** A switch change gave up waiting for an in-flight send; nothing changed and it can be retried. */
export class SwitchBusyError extends Error {
  constructor() {
    super('Waiting for an in-flight review-request send; the switch did not change. Try again.');
    this.name = 'SwitchBusyError';
  }
}

/** True when PostgreSQL cancelled a statement on lock_timeout (SQLSTATE 55P03), however Prisma wrapped it. */
export function isLockNotAvailableError(e: unknown): boolean {
  const seen = new Set<unknown>();
  const queue: unknown[] = [e];
  while (queue.length > 0 && seen.size < 50) {
    const cur = queue.shift();
    if (!cur || typeof cur !== 'object' || seen.has(cur)) continue;
    seen.add(cur);
    const o = cur as Record<string, unknown>;
    if (o.code === '55P03' || o.originalCode === '55P03') return true;
    for (const k of ['message', 'originalMessage']) {
      const v = o[k];
      if (typeof v === 'string' && /lock timeout/i.test(v)) return true;
    }
    for (const v of Object.values(o)) if (v && typeof v === 'object') queue.push(v);
    if (o.cause) queue.push(o.cause);
  }
  return false;
}

/** True when Prisma could not start the transaction in time (no pool connection) — nothing ran. */
export function isTransactionStartTimeoutError(e: unknown): boolean {
  const o = e as { code?: unknown; message?: unknown } | null;
  if (!o || typeof o !== 'object') return false;
  const message = typeof o.message === 'string' ? o.message : '';
  if (o.code === 'P2024') return true; // timed out fetching a connection from the pool
  return o.code === 'P2028' && /unable to start a transaction/i.test(message);
}

/**
 * Switch review-request emails on or off (admin only; spec D10d, D10e). In ONE transaction: take
 * the switch's fair lock exclusive (which waits for every in-flight send and stops later ones
 * starting), lock the switch row, re-validate the admin from the database, change the switch, and
 * append the change with old value, new value and a durable snapshot of that verified admin.
 * Switching on affects only completions recorded from this moment; switching off stops every send
 * whose locked checks have not yet run. The waits are bounded above the longest send, so a change
 * lands; if a send somehow outlasts that bound, SwitchBusyError is thrown and nothing changed.
 */
export async function setReviewRequestEmailsEnabled(enabled: boolean, session: AdminSessionProvenance | null | undefined) {
  try {
    return await prisma.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL lock_timeout = '${REVIEW_REQUEST_SWITCH_LOCK_TIMEOUT_MS}ms'`);
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${SWITCH_LOCK_CLASS}::int4, ${SWITCH_LOCK_ID}::int4)`;
        const current = await tx.$queryRaw<Array<{ enabled: boolean }>>`
          SELECT "enabled" FROM "lms_review_request_settings" WHERE "id" = 1 FOR UPDATE`;
        if (current.length !== 1) throw new Error('lms_review_request_settings row is missing');
        const actor = await requireCurrentAdmin(tx, session);
        await tx.lmsReviewRequestSettings.update({ where: { id: 1 }, data: { enabled } });
        const event = await tx.lmsReviewRequestSwitchEvent.create({
          data: {
            oldEnabled: current[0]!.enabled,
            newEnabled: enabled,
            actorKind: actor.kind,
            actorRef: actor.ref,
            actorEmail: actor.email,
          },
          select: { createdAt: true },
        });
        return { enabled, changedAt: event.createdAt, actor };
      },
      { maxWait: REVIEW_REQUEST_SWITCH_CONNECTION_WAIT_MS, timeout: REVIEW_REQUEST_SWITCH_TRANSACTION_TIMEOUT_MS }
    );
  } catch (e) {
    if (isLockNotAvailableError(e) || isTransactionStartTimeoutError(e)) throw new SwitchBusyError();
    throw e;
  }
}

/** The switch history, newest first (admin view). */
export async function listReviewRequestSwitchEvents(limit = 20) {
  return prisma.lmsReviewRequestSwitchEvent.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: { oldEnabled: true, newEnabled: true, actorKind: true, actorEmail: true, createdAt: true },
  });
}

/** Pure: the completed_at window a run considers — 3 to 14 days old. */
export function reviewRequestWindow(now: Date): { from: Date; to: Date } {
  return {
    from: new Date(now.getTime() - REVIEW_REQUEST_MAX_AGE_DAYS * DAY_MS),
    to: new Date(now.getTime() - REVIEW_REQUEST_MIN_AGE_DAYS * DAY_MS),
  };
}

/** Pure: did the provider really accept the message? `dev_console` only printed it. */
export function wasReallySent(result: SendEmailResult): boolean {
  return result.sent === true && result.reason !== 'dev_console';
}

/** Pure: an HTTP status that is a definite rejection of the request (validation, auth, rate limit). */
function isDefiniteRejectionStatus(status: number | undefined): boolean {
  return typeof status === 'number' && status >= 400 && status < 500;
}

/**
 * Pure: a failure we KNOW delivered nothing, so a retry cannot duplicate the email (D9b).
 * - `not_configured`: the provider was never called.
 * - `provider_error` with a 4xx status: Mailtrap rejected the request.
 * - `dev_console` with no provider reply, or a 4xx one: printed locally, never sent.
 * Everything else is ambiguous and never retried: a 5xx (Mailtrap documents 500 as an internal
 * error with no no-delivery assurance), an error status we did not see, `send_failed` (network
 * error or timeout), or a 2xx reply that still said it failed.
 */
export function isDefiniteNonDelivery(result: SendEmailResult): boolean {
  if (wasReallySent(result)) return false;
  if (result.reason === 'not_configured') return true;
  if (result.reason === 'provider_error') return isDefiniteRejectionStatus(result.httpStatus);
  if (result.reason === 'dev_console') {
    return result.httpStatus === undefined || isDefiniteRejectionStatus(result.httpStatus);
  }
  return false;
}

/** Pure: the review-request email. The same words for every learner; no reward, no rating. */
export function renderReviewRequestEmail(params: {
  appOrigin: string;
  name: string;
  courseTitle: string;
  reviewUrl: string;
  unsubscribeUrl: string;
}): RenderedEmail & { subject: string } {
  const subject = `How was ${params.courseTitle}?`;
  const paragraphs = [
    `You recently finished ${params.courseTitle} with CARSI.`,
    'Would you tell other technicians what it was like? A few lines in your own words is plenty — what worked, what did not, and who it suits.',
    'We ask everyone who completes a course, once. Your review appears on the course page under your first name.',
  ];
  const html = buildCarsiEmailHtml({
    appOrigin: params.appOrigin,
    preheader: `Tell other technicians what ${params.courseTitle} was like, in your own words.`,
    eyebrow: 'Course review',
    // No accreditation tagline: the email is identical for every course, and many courses (e.g.
    // truckmount, floor care) carry no accreditation framing (CLAUDE.md fail-closed rule).
    wordmarkTagline: null,
    title: 'How was your course?',
    greeting: `Hi ${params.name},`,
    paragraphs,
    cta: { label: 'Write your review', href: params.reviewUrl },
    noteHtml:
      'You are receiving this because you completed a course with CARSI (support@carsi.com.au). ' +
      `We send one review request per completed course. ${brandLink(params.unsubscribeUrl, 'Unsubscribe')} from CARSI emails like this.`,
  });
  const text = [
    `Hi ${params.name},`,
    '',
    ...paragraphs.flatMap((p) => [p, '']),
    `Write your review: ${params.reviewUrl}`,
    '',
    'You are receiving this because you completed a course with CARSI (support@carsi.com.au).',
    `Unsubscribe: ${params.unsubscribeUrl}`,
  ].join('\n');
  return { subject, html, text };
}

/** Send one review-request email with RFC 8058 one-click unsubscribe headers. */
/**
 * Build the complete review-request message (signs the unsubscribe token, renders the body). Runs
 * BEFORE any provider request, so a failure here — e.g. a missing signing secret — means nothing
 * was sent and the send stays retryable (release-gate r8).
 */
export async function prepareReviewRequestEmail(params: {
  to: string;
  userId: string;
  name: string;
  courseTitle: string;
  courseSlug: string;
}): Promise<SendEmailParams> {
  const appOrigin = getAppOrigin();
  const token = await signEmailUnsubscribeToken(params.userId);
  // Footer link: the browser confirmation page. Header: the RFC 8058 endpoint mail clients POST
  // to. `/unsubscribe` is a page, not a POST handler (independent review, 18/10/2026).
  const unsubscribeUrl = buildUnsubscribeUrl(appOrigin, token);
  const oneClickUrl = `${appOrigin.replace(/\/$/, '')}/api/unsubscribe?token=${encodeURIComponent(token)}`;
  const reviewUrl = `${appOrigin.replace(/\/$/, '')}/dashboard/courses/${encodeURIComponent(params.courseSlug)}#reviews`;
  const { subject, html, text } = renderReviewRequestEmail({
    appOrigin,
    name: params.name,
    courseTitle: params.courseTitle,
    reviewUrl,
    unsubscribeUrl,
  });
  return {
    to: params.to,
    subject,
    html,
    text,
    // A review request is solicitation, not a course-service message: Mailtrap's Bulk Stream.
    stream: 'bulk',
    // Sent inside a transaction that holds row locks: bound how long they are held.
    timeoutMs: REVIEW_REQUEST_PROVIDER_TIMEOUT_MS,
    headers: {
      'List-Unsubscribe': `<${oneClickUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  };
}

/** Prepare and send one review-request email (outside the cron runner, e.g. a manual send). */
export async function sendReviewRequestEmail(params: Parameters<typeof prepareReviewRequestEmail>[0]): Promise<SendEmailResult> {
  return sendEmail(await prepareReviewRequestEmail(params));
}

export type ReviewRequestSkipReason =
  | 'onboarding_course'
  | 'claimed_elsewhere'
  | 'same_learner_this_run'
  | 'already_reviewed'
  | 'opted_out'
  | 'no_email'
  | 'inactive_account'
  | 'not_completed';

export type ReviewRequestRunResult = {
  ok: boolean;
  /** Why nothing was attempted, when nothing was (never conflated with "nobody eligible"). */
  reason?: 'disabled' | 'settings_missing' | 'email_not_configured';
  /** The switch was turned off during this run; no further send was started. */
  stopped_by_switch?: boolean;
  /** Another run was sending (global send mutex); this run stopped and left the rest for later. */
  deferred_to_running_send?: boolean;
  dry_run: boolean;
  window?: { from: string; to: string };
  candidates: number;
  would_send: number;
  sent: number;
  /** Definite failures (retryable), ambiguous outcomes and pre-send errors. Any > 0 means not ok. */
  failed: number;
  /** Outcome unknown (may have been delivered): never resent; a human reconciles it. */
  ambiguous: number;
  skipped: Partial<Record<ReviewRequestSkipReason, number>>;
  /** Enrolment ids whose send failed or was ambiguous (never email addresses — PII stays out of logs). */
  failed_enrollment_ids: string[];
};


/** The provider call's hard timeout inside the locked send transaction (release-gate r6). */
export const REVIEW_REQUEST_PROVIDER_TIMEOUT_MS = 10_000;
/** The locked send transaction's own limit: provider timeout plus room for the locked reads/writes. */
export const REVIEW_REQUEST_SEND_TRANSACTION_TIMEOUT_MS = 20_000;

export type SendGateOutcome =
  | { kind: 'send'; to: string; name: string }
  | { kind: 'lost_claim' }
  | {
      kind: 'hold';
      /** What the ledger row becomes; nothing was sent and no attempt is used. */
      status: 'eligible' | 'ineligible' | 'skipped';
      reason:
        | 'switched_off'
        | 'not_completed'
        | 'completion_changed'
        | 'already_reviewed'
        | 'opted_out'
        | 'inactive_account'
        | 'no_email';
      skip: ReviewRequestSkipReason;
    }
  | { kind: 'sent' }
  | { kind: 'failed' }
  | { kind: 'ambiguous' }
  /** Another run holds the global send mutex; this run stops and leaves the row as it was. */
  | { kind: 'busy' };

/**
 * Pure: the final, binding decision made INSIDE the locked send transaction, from rows read under
 * those locks (release-gate r6). All conditions are checked together: this run still owns the
 * claim, the claim is for the same completion, the switch is on, the enrolment is completed now,
 * the learner has not reviewed the course (read under the enrolment lock that review submission
 * also takes, r7), and the learner is active, has an email and has not unsubscribed.
 */
export function decideSendGate(input: {
  switchOn: boolean;
  enrolment: { status: string; completed_at: Date | null } | null;
  /** A review by this learner for this course exists, read after the enrolment row lock was taken. */
  reviewed: boolean;
  learner: { email: string; full_name: string | null; email_opt_out: boolean; is_active: boolean } | null;
  ledger: { status: string; claim_token: string | null; completion_seq: number } | null;
  claimToken: string;
  claimedCompletionSeq: number;
}): Extract<SendGateOutcome, { kind: 'send' | 'lost_claim' | 'hold' }> {
  const { ledger, enrolment, learner } = input;
  if (!ledger || ledger.status !== 'pending' || ledger.claim_token !== input.claimToken) return { kind: 'lost_claim' };
  if (ledger.completion_seq !== input.claimedCompletionSeq) {
    return { kind: 'hold', status: 'ineligible', reason: 'completion_changed', skip: 'not_completed' };
  }
  if (!input.switchOn) return { kind: 'hold', status: 'eligible', reason: 'switched_off', skip: 'claimed_elsewhere' };
  if (!enrolment || enrolment.status !== 'completed' || enrolment.completed_at === null) {
    return { kind: 'hold', status: 'ineligible', reason: 'not_completed', skip: 'not_completed' };
  }
  if (input.reviewed) return { kind: 'hold', status: 'skipped', reason: 'already_reviewed', skip: 'already_reviewed' };
  if (!learner || !learner.is_active) return { kind: 'hold', status: 'skipped', reason: 'inactive_account', skip: 'inactive_account' };
  if (learner.email_opt_out) return { kind: 'hold', status: 'skipped', reason: 'opted_out', skip: 'opted_out' };
  if (!learner.email?.trim()) return { kind: 'hold', status: 'skipped', reason: 'no_email', skip: 'no_email' };
  return { kind: 'send', to: learner.email, name: learner.full_name?.trim().split(/\s+/)[0] || 'there' };
}

type LedgerSnapshot = {
  status: string;
  attempts: number;
  completionSeq: number;
  claimToken: string | null;
  sendAttemptedAt: Date | null;
  updatedAt: Date;
};

type Candidate = {
  id: string;
  studentId: string;
  courseId: string;
  completedAt: Date | null;
  course: { slug: string; title: string; category: string | null; meta?: unknown };
  reviewRequestEmail: LedgerSnapshot | null;
};

/**
 * One run of the review-request job. `dryRun` performs the same eligibility reads but writes
 * and sends nothing, so its `would_send` matches what a real run would attempt.
 */
export async function runReviewRequestEmails(options: { now?: Date; dryRun?: boolean }): Promise<ReviewRequestRunResult> {
  const now = options.now ?? new Date();
  const dryRun = options.dryRun === true;
  const base: ReviewRequestRunResult = {
    ok: true,
    dry_run: dryRun,
    candidates: 0,
    would_send: 0,
    sent: 0,
    failed: 0,
    ambiguous: 0,
    skipped: {},
    failed_enrollment_ids: [],
  };
  const settings = await readReviewRequestSettings();
  if (settings.missing) return { ...base, ok: false, reason: 'settings_missing' };
  if (!settings.enabled) return { ...base, reason: 'disabled' };
  if (!dryRun && !isEmailConfigured()) return { ...base, ok: false, reason: 'email_not_configured' };

  const window = reviewRequestWindow(now);
  const leaseCutoff = new Date(now.getTime() - REVIEW_REQUEST_CLAIM_LEASE_MINUTES * 60_000);
  const result: ReviewRequestRunResult = {
    ...base,
    window: { from: window.from.toISOString(), to: window.to.toISOString() },
  };
  const skip = (r: ReviewRequestSkipReason) => {
    result.skipped[r] = (result.skipped[r] ?? 0) + 1;
  };
  const capReached = () => result.sent + result.failed + result.would_send >= REVIEW_REQUEST_MAX_SENDS_PER_RUN;
  const learnersThisRun = new Set<string>();

  async function processCandidate(enrolment: Candidate): Promise<void> {
    const ledger = enrolment.reviewRequestEmail;
    if (!ledger) return; // never eligible: the query excludes these; belt and braces

    if (isOnboardingCourse({ slug: enrolment.course.slug, category: enrolment.course.category, meta: enrolment.course.meta })) {
      skip('onboarding_course');
      if (!dryRun && ledger.status === 'eligible') {
        // Record it so the row stops occupying later pages.
        await prisma.lmsReviewRequestEmail.updateMany({
          where: { enrollmentId: enrolment.id, status: 'eligible' },
          data: { status: 'skipped', failureReason: 'onboarding_course' },
        });
      }
      return;
    }
    if (learnersThisRun.has(enrolment.studentId)) {
      skip('same_learner_this_run');
      return;
    }

    // An interrupted claim that may already have reached the provider is never resent.
    if (ledger.status === 'pending' && ledger.sendAttemptedAt) {
      if (dryRun) return;
      const marked = await prisma.lmsReviewRequestEmail.updateMany({
        where: { enrollmentId: enrolment.id, status: 'pending', claimToken: ledger.claimToken, updatedAt: { lt: leaseCutoff } },
        data: { status: 'ambiguous', failureReason: 'interrupted_after_send_attempt', claimToken: null },
      });
      if (marked.count > 0) {
        result.ambiguous += 1;
        result.failed += 1;
        result.failed_enrollment_ids.push(enrolment.id);
      }
      return;
    }

    let token: string | null = null;
    if (!dryRun) {
      // Claim. Each conditional update can be won by exactly one run: an eligible row, a
      // retryable definite failure, or a pending claim whose lease expired before any send.
      token = randomUUID();
      const where =
        ledger.status === 'eligible'
          ? { enrollmentId: enrolment.id, status: 'eligible', completionSeq: ledger.completionSeq }
          : ledger.status === 'failed'
            ? { enrollmentId: enrolment.id, status: 'failed', attempts: { lt: REVIEW_REQUEST_MAX_ATTEMPTS } }
            : {
                enrollmentId: enrolment.id,
                status: 'pending',
                claimToken: ledger.claimToken,
                sendAttemptedAt: null,
                updatedAt: { lt: leaseCutoff },
              };
      const claimed = await prisma.lmsReviewRequestEmail.updateMany({
        where,
        data: { status: 'pending', claimToken: token, sendAttemptedAt: null },
      });
      if (claimed.count === 0) {
        skip('claimed_elsewhere');
        return;
      }
    }
    learnersThisRun.add(enrolment.studentId);

    // Only the owner of the claim may finish it.
    const finish = (data: Record<string, unknown>) =>
      prisma.lmsReviewRequestEmail.updateMany({
        where: { enrollmentId: enrolment.id, claimToken: token },
        data: { ...data, claimToken: null },
      });

    // Cheap pre-check (not the decision): skip learners already known to be ineligible. The
    // binding checks run again inside the locked send transaction below.
    let learner: { email: string; fullName: string | null; emailOptOut: boolean; isActive: boolean } | null;
    let reviewed: boolean;
    try {
      // One query at a time: a run never holds more than one pool connection (release-gate r8).
      const user = await prisma.lmsUser.findUnique({
        where: { id: enrolment.studentId },
        select: { email: true, fullName: true, emailOptOut: true, isActive: true },
      });
      const review = await prisma.lmsCourseReview.findUnique({
        where: { courseId_studentId: { courseId: enrolment.courseId, studentId: enrolment.studentId } },
        select: { id: true },
      });
      learner = user;
      reviewed = review !== null;
    } catch {
      // Nothing was sent: release the claim as a retryable failure without using an attempt.
      if (!dryRun) await finish({ status: 'failed', failureReason: 'pre_send_error' });
      result.failed += 1;
      result.failed_enrollment_ids.push(enrolment.id);
      return;
    }

    const terminalSkip: ReviewRequestSkipReason | null = reviewed
      ? 'already_reviewed'
      : !learner || !learner.isActive
        ? 'inactive_account'
        : learner.emailOptOut
          ? 'opted_out'
          : !learner.email?.trim()
            ? 'no_email'
            : null;
    if (terminalSkip || !learner) {
      const why = terminalSkip ?? 'inactive_account';
      if (!dryRun) await finish({ status: 'skipped', failureReason: why });
      skip(why);
      return;
    }

    if (dryRun) {
      result.would_send += 1;
      return;
    }

    // Step 1 (its own commit): mark the attempt. If this process dies at any point after this,
    // a later run sees send_attempted_at and records the outcome as ambiguous — never resent.
    const marked = await prisma.lmsReviewRequestEmail.updateMany({
      where: { enrollmentId: enrolment.id, claimToken: token, completionSeq: ledger.completionSeq },
      data: { sendAttemptedAt: now },
    });
    if (marked.count === 0) {
      skip('claimed_elsewhere');
      return;
    }

    // Step 2: ONE transaction holds shared locks on the switch (its fair lock and its row), the
    // enrolment row and the learner row for the whole provider call (release-gate r6, r7).
    // Switching off, unsubscribing, revoking and submitting a review all conflict with these locks,
    // so each either commits before the checks below — and this send does not happen — or waits
    // until this send has finished and been recorded. Lock order matches the completion trigger,
    // so nothing deadlocks. Every wait and the provider call are bounded, so the locks are held for
    // a bounded time and a switch change waiting behind them always lands.
    let outcome: SendGateOutcome;
    let providerCalled = false;
    try {
      outcome = await prisma.$transaction(
        async (tx) => {
          await tx.$executeRawUnsafe(`SET LOCAL lock_timeout = '${REVIEW_REQUEST_SEND_LOCK_TIMEOUT_MS}ms'`);
          await tx.$executeRawUnsafe(
            `SET LOCAL idle_in_transaction_session_timeout = '${REVIEW_REQUEST_SEND_IDLE_TIMEOUT_MS}ms'`
          );
          const mutex = await tx.$queryRaw<Array<{ acquired: boolean }>>`
            SELECT pg_try_advisory_xact_lock(${SWITCH_LOCK_CLASS}::int4, ${SEND_MUTEX_ID}::int4) AS "acquired"`;
          if (mutex[0]?.acquired !== true) {
            // Another run is sending right now: give the row back untouched and stop this run.
            await tx.lmsReviewRequestEmail.updateMany({
              where: { enrollmentId: enrolment.id, claimToken: token },
              data: { status: ledger.status === 'failed' ? 'failed' : 'eligible', sendAttemptedAt: null, claimToken: null },
            });
            return { kind: 'busy' as const };
          }
          await tx.$executeRaw`SELECT pg_advisory_xact_lock_shared(${SWITCH_LOCK_CLASS}::int4, ${SWITCH_LOCK_ID}::int4)`;
          const sw = await tx.$queryRaw<Array<{ enabled: boolean }>>`
            SELECT "enabled" FROM "lms_review_request_settings" WHERE "id" = 1 FOR SHARE`;
          const enr = await tx.$queryRaw<Array<{ status: string; completed_at: Date | null }>>`
            SELECT "status", "completed_at" FROM "lms_enrollments" WHERE "id" = ${enrolment.id}::uuid FOR SHARE`;
          // Read AFTER the enrolment lock: review submission locks the same row (FOR NO KEY UPDATE)
          // before writing, so a review either committed already (seen here) or waits for this send.
          const rev = await tx.$queryRaw<Array<{ id: string }>>`
            SELECT "id" FROM "lms_course_reviews"
             WHERE "course_id" = ${enrolment.courseId}::uuid AND "student_id" = ${enrolment.studentId}::uuid LIMIT 1`;
          const usr = await tx.$queryRaw<
            Array<{ email: string; full_name: string | null; email_opt_out: boolean; is_active: boolean }>
          >`
            SELECT "email", "full_name", "email_opt_out", "is_active" FROM "lms_users" WHERE "id" = ${enrolment.studentId}::uuid FOR SHARE`;
          const led = await tx.$queryRaw<Array<{ status: string; claim_token: string | null; completion_seq: number }>>`
            SELECT "status", "claim_token", "completion_seq" FROM "lms_review_request_emails"
             WHERE "enrollment_id" = ${enrolment.id}::uuid FOR UPDATE`;

          const decision = decideSendGate({
            switchOn: sw[0]?.enabled === true,
            enrolment: enr[0] ?? null,
            reviewed: rev.length > 0,
            learner: usr[0] ?? null,
            ledger: led[0] ?? null,
            claimToken: token!,
            claimedCompletionSeq: ledger.completionSeq,
          });
          const close = (data: Record<string, unknown>) =>
            tx.lmsReviewRequestEmail.updateMany({
              where: { enrollmentId: enrolment.id, claimToken: token },
              data: { ...data, claimToken: null },
            });
          if (decision.kind === 'lost_claim') return decision;
          if (decision.kind === 'hold') {
            await close({ status: decision.status, failureReason: decision.reason, sendAttemptedAt: null });
            return decision;
          }

          // Build the whole message first: a failure here (e.g. token signing) sends nothing and
          // escapes the transaction as a retryable pre-send failure (release-gate r8).
          const message = await prepareReviewRequestEmail({
            to: decision.to,
            userId: enrolment.studentId,
            name: decision.name,
            courseTitle: enrolment.course.title,
            courseSlug: enrolment.course.slug,
          });
          let sendResult: SendEmailResult;
          try {
            sendResult = await sendEmail({
              ...message,
              // The ONLY point after which a failure may mean the message was delivered.
              onRequestStart: () => {
                providerCalled = true;
              },
            });
          } catch (e) {
            if (!providerCalled) throw e; // failed while building the request: nothing was sent
            sendResult = { sent: false, reason: 'send_failed' };
          }
          if (wasReallySent(sendResult)) {
            await close({
              status: 'sent',
              failureReason: null,
              providerMessageId: sendResult.messageId ?? null,
              sentAt: now,
              attempts: { increment: 1 },
            });
            return { kind: 'sent' as const };
          }
          if (isDefiniteNonDelivery(sendResult)) {
            await close({
              status: 'failed',
              failureReason: sendResult.reason ?? 'unknown',
              sendAttemptedAt: null,
              attempts: { increment: 1 },
            });
            return { kind: 'failed' as const };
          }
          await close({ status: 'ambiguous', failureReason: sendResult.reason ?? 'unknown', attempts: { increment: 1 } });
          return { kind: 'ambiguous' as const };
        },
        { maxWait: 5_000, timeout: REVIEW_REQUEST_SEND_TRANSACTION_TIMEOUT_MS }
      );
    } catch {
      if (!providerCalled) {
        // Failed before any provider request was made (a lock wait timed out, the message could
      // not be built, ...): nothing was sent.
        // Release the claim as a retryable failure without using an attempt.
        await finish({ status: 'failed', failureReason: 'pre_send_error', sendAttemptedAt: null }).catch(() => {});
        result.failed += 1;
        result.failed_enrollment_ids.push(enrolment.id);
        return;
      }
      // The transaction failed or timed out after the provider call, so the message may have been
      // accepted. It rolled back, so the committed attempt mark from step 1 remains: ambiguous,
      // never resent.
      outcome = { kind: 'ambiguous' };
    }

    switch (outcome.kind) {
      case 'sent':
        result.sent += 1;
        return;
      case 'failed':
        result.failed += 1;
        result.failed_enrollment_ids.push(enrolment.id);
        return;
      case 'ambiguous':
        result.failed += 1;
        result.ambiguous += 1;
        result.failed_enrollment_ids.push(enrolment.id);
        return;
      case 'lost_claim':
        skip('claimed_elsewhere');
        return;
      case 'busy':
        result.deferred_to_running_send = true;
        return;
      case 'hold':
        if (outcome.reason === 'switched_off') result.stopped_by_switch = true;
        else skip(outcome.skip);
        return;
    }
  }

  let after: { completedAt: Date; id: string } | null = null;
  for (let page = 0; page < MAX_PAGES && !capReached(); page += 1) {
    // Only enrolments the trigger marked eligible at completion (or their retryable / recoverable
    // follow-ups). A completion with no ledger row is never selected, so it is never emailed.
    const candidates: Candidate[] = await prisma.lmsEnrollment.findMany({
      where: {
        status: 'completed',
        completedAt: { gte: window.from, lte: window.to },
        OR: [
          { reviewRequestEmail: { is: { status: 'eligible' } } },
          { reviewRequestEmail: { is: { status: 'failed', attempts: { lt: REVIEW_REQUEST_MAX_ATTEMPTS } } } },
          { reviewRequestEmail: { is: { status: 'pending', updatedAt: { lt: leaseCutoff } } } },
        ],
        ...(after
          ? {
              AND: [
                {
                  OR: [
                    { completedAt: { gt: after.completedAt } },
                    { completedAt: after.completedAt, id: { gt: after.id } },
                  ],
                },
              ],
            }
          : {}),
      },
      orderBy: [{ completedAt: 'asc' }, { id: 'asc' }],
      take: PAGE_SIZE,
      select: {
        id: true,
        studentId: true,
        courseId: true,
        completedAt: true,
        course: { select: { slug: true, title: true, category: true, meta: true } },
        reviewRequestEmail: {
          select: { status: true, attempts: true, completionSeq: true, claimToken: true, sendAttemptedAt: true, updatedAt: true },
        },
      },
    });
    if (candidates.length === 0) break;
    result.candidates += candidates.length;
    const last = candidates[candidates.length - 1]!;
    after = { completedAt: last.completedAt!, id: last.id };
    for (const enrolment of candidates) {
      if (capReached() || result.stopped_by_switch || result.deferred_to_running_send) break;
      await processCandidate(enrolment);
    }
    if (candidates.length < PAGE_SIZE || result.stopped_by_switch || result.deferred_to_running_send) break;
  }

  result.ok = result.failed === 0;
  return result;
}
