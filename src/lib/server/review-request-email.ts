/**
 * Review-request email (spec 2026-10-18 D9, D10, D11, D12, D16, D17). DORMANT BY DEFAULT.
 *
 * One email, a few days after a learner completes a course, asking every completer the same
 * thing: tell other technicians what the course was like, in your own words. No reward, no
 * suggested text, no rating screen (ACCC online-review guidance). It is a commercial electronic
 * message under the Spam Act 2003, so opt-out is re-read right before each send and every
 * message carries one-click unsubscribe headers plus a visible unsubscribe link.
 *
 * Sends nothing unless REVIEW_REQUEST_EMAILS_ENABLED is exactly "true" AND
 * REVIEW_REQUEST_EMAILS_SINCE is a valid date — so turning the flag on can never mail the whole
 * back catalogue. No scheduler ships with this code: sending stays Phill's decision (D12).
 *
 * "At most once per enrolment" is enforced by the UNIQUE `enrollment_id` on
 * lms_review_request_emails. A run claims the row (pending + claim token) before sending; a row
 * becomes `sent` only when the provider actually accepted the message.
 *
 * Failures are split by what we know (independent review, 18/10/2026):
 * - DEFINITE (provider answered with an error, not configured, dev console): nothing was
 *   delivered, so the row is `failed` and a later run retries it (max 3 attempts).
 * - AMBIGUOUS (network error or timeout after the request left, a throw, or a claim interrupted
 *   after `send_attempted_at` was set): the provider may have delivered it. The row becomes
 *   `ambiguous` and is NEVER resent automatically, because a duplicate breaks "at most once".
 * A claim interrupted before any send attempt is recovered by a later run once its lease expires.
 */

import { randomUUID } from 'node:crypto';

import { getAppOrigin } from '@/lib/server/app-url';
import { buildCarsiEmailHtml, brandLink, type RenderedEmail } from '@/lib/server/email-templates';
import { buildUnsubscribeUrl } from '@/lib/server/email-preferences';
import { isEmailConfigured, sendEmail, type SendEmailResult } from '@/lib/server/email';
import { isOnboardingCourse } from '@/lib/onboarding/enterprise';
import { signEmailUnsubscribeToken } from '@/lib/auth/session-jwt';
import { prisma } from '@/lib/prisma';

const DAY_MS = 86_400_000;
/** Ask a few days after completion, once the learner has had time to use what they learnt. */
export const REVIEW_REQUEST_MIN_AGE_DAYS = 3;
/** Completions older than this are never emailed, so a missed daily run loses nobody but the window stays bounded. */
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

export type ReviewRequestConfig =
  | { enabled: true; since: Date }
  | { enabled: false; reason: 'disabled' | 'since_missing' | 'since_invalid' };

/** Pure: parse the two env vars. Only the exact string "true" enables sending. */
export function readReviewRequestConfig(env: Record<string, string | undefined>): ReviewRequestConfig {
  if (env.REVIEW_REQUEST_EMAILS_ENABLED !== 'true') return { enabled: false, reason: 'disabled' };
  const raw = env.REVIEW_REQUEST_EMAILS_SINCE?.trim();
  if (!raw) return { enabled: false, reason: 'since_missing' };
  const since = parseStrictSince(raw);
  return since ? { enabled: true, since } : { enabled: false, reason: 'since_invalid' };
}

const SINCE_FORMAT = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

/**
 * Pure: parse REVIEW_REQUEST_EMAILS_SINCE strictly. JavaScript's Date silently rolls impossible
 * dates forward (`2026-02-31` becomes 3 March), so every field is range-checked against the real
 * calendar before the date may enable sending.
 */
export function parseStrictSince(raw: string): Date | null {
  const m = SINCE_FORMAT.exec(raw);
  if (!m) return null;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth) return null;
  if (m[4] !== undefined && (Number(m[4]) > 23 || Number(m[5]) > 59 || (m[6] !== undefined && Number(m[6]) > 59))) {
    return null;
  }
  if (m[7] && m[7] !== 'Z') {
    const [oh, om] = [Number(m[7].slice(1, 3)), Number(m[7].slice(-2))];
    if (oh > 14 || om > 59) return null;
  }
  const since = new Date(raw);
  return Number.isNaN(since.getTime()) ? null : since;
}

/**
 * Pure: the completed_at window a run considers (D10, D10b). It starts at the LATEST of SINCE,
 * the stored activation instant, and the 14-day age limit. So a completion from before sending
 * was switched on is never mailed, whatever path set its completed_at, and it ends 3 days ago.
 */
export function reviewRequestWindow(
  bounds: { since: Date; activatedAt: Date },
  now: Date
): { from: Date; to: Date } {
  const oldest = now.getTime() - REVIEW_REQUEST_MAX_AGE_DAYS * DAY_MS;
  return {
    from: new Date(Math.max(bounds.since.getTime(), bounds.activatedAt.getTime(), oldest)),
    to: new Date(now.getTime() - REVIEW_REQUEST_MIN_AGE_DAYS * DAY_MS),
  };
}

/**
 * The stored first-activation instant (D10b). The first REAL enabled run records it once (dry runs
 * never do), so completions from before sending was switched on are never backfilled. A missing
 * or unreadable record fails closed: the run sends nothing.
 */
async function readOrRecordActivation(now: Date, dryRun: boolean): Promise<Date | null> {
  const existing = await prisma.lmsReviewRequestActivation.findUnique({ where: { id: 1 } });
  if (existing) return existing.activatedAt;
  if (dryRun) return null;
  try {
    await prisma.lmsReviewRequestActivation.create({ data: { id: 1, activatedAt: now } });
  } catch (e) {
    if (!isUniqueViolation(e)) throw e; // a concurrent first run recorded it first
  }
  const stored = await prisma.lmsReviewRequestActivation.findUnique({ where: { id: 1 } });
  return stored?.activatedAt ?? null;
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
export async function sendReviewRequestEmail(params: {
  to: string;
  userId: string;
  name: string;
  courseTitle: string;
  courseSlug: string;
}): Promise<SendEmailResult> {
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
  return sendEmail({
    to: params.to,
    subject,
    html,
    text,
    headers: {
      'List-Unsubscribe': `<${oneClickUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  });
}

export type ReviewRequestSkipReason =
  | 'onboarding_course'
  | 'claimed_elsewhere'
  | 'same_learner_this_run'
  | 'already_reviewed'
  | 'opted_out'
  | 'no_email'
  | 'inactive_account';

export type ReviewRequestRunResult = {
  ok: boolean;
  /** Why nothing was attempted, when nothing was (never conflated with "nobody eligible"). */
  reason?:
    | 'disabled'
    | 'since_missing'
    | 'since_invalid'
    | 'email_not_configured'
    | 'not_activated'
    | 'activation_unrecorded';
  dry_run: boolean;
  /** Stored first-activation instant; completions before it are never emailed (D10b). */
  activated_at?: string;
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

function isUniqueViolation(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: string }).code === 'P2002';
}

type LedgerSnapshot = {
  status: string;
  attempts: number;
  claimToken: string | null;
  sendAttemptedAt: Date | null;
  updatedAt: Date;
} | null;

type Candidate = {
  id: string;
  studentId: string;
  courseId: string;
  completedAt: Date | null;
  course: { slug: string; title: string; category: string | null; meta?: unknown };
  reviewRequestEmail: LedgerSnapshot;
};

/**
 * One run of the review-request job. `dryRun` performs the same eligibility reads but writes
 * and sends nothing, so its `would_send` matches what a real run would attempt.
 */
export async function runReviewRequestEmails(options: {
  now?: Date;
  dryRun?: boolean;
  env?: Record<string, string | undefined>;
}): Promise<ReviewRequestRunResult> {
  const now = options.now ?? new Date();
  const dryRun = options.dryRun === true;
  const config = readReviewRequestConfig(options.env ?? process.env);
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
  if (!config.enabled) return { ...base, reason: config.reason };
  if (!dryRun && !isEmailConfigured()) return { ...base, ok: false, reason: 'email_not_configured' };

  const activatedAt = await readOrRecordActivation(now, dryRun);
  if (!activatedAt) {
    // Dry run before the first real run: nobody is eligible yet, by design (no backfill).
    // Real run that could not durably record the boundary: fail closed and loudly.
    return dryRun ? { ...base, reason: 'not_activated' } : { ...base, ok: false, reason: 'activation_unrecorded' };
  }

  const window = reviewRequestWindow({ since: config.since, activatedAt }, now);
  const leaseCutoff = new Date(now.getTime() - REVIEW_REQUEST_CLAIM_LEASE_MINUTES * 60_000);
  const result: ReviewRequestRunResult = {
    ...base,
    activated_at: activatedAt.toISOString(),
    window: { from: window.from.toISOString(), to: window.to.toISOString() },
  };
  if (window.from.getTime() > window.to.getTime()) return result;
  const skip = (r: ReviewRequestSkipReason) => {
    result.skipped[r] = (result.skipped[r] ?? 0) + 1;
  };
  const capReached = () => result.sent + result.failed + result.would_send >= REVIEW_REQUEST_MAX_SENDS_PER_RUN;
  const learnersThisRun = new Set<string>();

  async function processCandidate(enrolment: Candidate): Promise<void> {
    const ledger = enrolment.reviewRequestEmail;

    if (isOnboardingCourse({ slug: enrolment.course.slug, category: enrolment.course.category, meta: enrolment.course.meta })) {
      skip('onboarding_course');
      if (!dryRun && !ledger) {
        // Record it so the row stops occupying later pages.
        await prisma.lmsReviewRequestEmail
          .create({ data: { enrollmentId: enrolment.id, status: 'skipped', failureReason: 'onboarding_course' } })
          .catch((e: unknown) => {
            if (!isUniqueViolation(e)) throw e;
          });
      }
      return;
    }
    if (learnersThisRun.has(enrolment.studentId)) {
      skip('same_learner_this_run');
      return;
    }

    // An interrupted claim that may already have reached the provider is never resent.
    if (ledger?.status === 'pending' && ledger.sendAttemptedAt) {
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
      // Claim. The UNIQUE key stops a concurrent first claim (P2002); the conditional updates let
      // exactly one run win a retry or a lease recovery.
      token = randomUUID();
      try {
        if (!ledger) {
          await prisma.lmsReviewRequestEmail.create({
            data: { enrollmentId: enrolment.id, status: 'pending', claimToken: token },
          });
        } else {
          const claimed = await prisma.lmsReviewRequestEmail.updateMany({
            where:
              ledger.status === 'failed'
                ? { enrollmentId: enrolment.id, status: 'failed', attempts: { lt: REVIEW_REQUEST_MAX_ATTEMPTS } }
                : {
                    enrollmentId: enrolment.id,
                    status: 'pending',
                    claimToken: ledger.claimToken,
                    sendAttemptedAt: null,
                    updatedAt: { lt: leaseCutoff },
                  },
            data: { status: 'pending', claimToken: token, sendAttemptedAt: null },
          });
          if (claimed.count === 0) {
            skip('claimed_elsewhere');
            return;
          }
        }
      } catch (e) {
        if (isUniqueViolation(e)) {
          skip('claimed_elsewhere');
          return;
        }
        throw e;
      }
    }
    learnersThisRun.add(enrolment.studentId);

    // Only the owner of the claim may finish it.
    const finish = (data: Record<string, unknown>) =>
      prisma.lmsReviewRequestEmail.updateMany({
        where: { enrollmentId: enrolment.id, claimToken: token },
        data: { ...data, claimToken: null },
      });

    // Re-read consent and review state immediately before sending (Spam Act; ask once).
    let learner: { email: string; fullName: string | null; emailOptOut: boolean; isActive: boolean } | null;
    let reviewed: boolean;
    try {
      const [user, review] = await Promise.all([
        prisma.lmsUser.findUnique({
          where: { id: enrolment.studentId },
          select: { email: true, fullName: true, emailOptOut: true, isActive: true },
        }),
        prisma.lmsCourseReview.findUnique({
          where: { courseId_studentId: { courseId: enrolment.courseId, studentId: enrolment.studentId } },
          select: { id: true },
        }),
      ]);
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

    // Mark the attempt BEFORE calling the provider: if this process dies mid-send, a later run
    // sees send_attempted_at and records the outcome as ambiguous instead of sending again.
    const started = await prisma.lmsReviewRequestEmail.updateMany({
      where: { enrollmentId: enrolment.id, claimToken: token },
      data: { sendAttemptedAt: now },
    });
    if (started.count === 0) {
      skip('claimed_elsewhere');
      return;
    }

    let sendResult: SendEmailResult;
    try {
      sendResult = await sendReviewRequestEmail({
        to: learner.email,
        userId: enrolment.studentId,
        name: learner.fullName?.trim().split(/\s+/)[0] || 'there',
        courseTitle: enrolment.course.title,
        courseSlug: enrolment.course.slug,
      });
    } catch {
      sendResult = { sent: false, reason: 'send_failed' };
    }

    if (wasReallySent(sendResult)) {
      await finish({
        status: 'sent',
        failureReason: null,
        providerMessageId: sendResult.messageId ?? null,
        sentAt: now,
        attempts: { increment: 1 },
      });
      result.sent += 1;
    } else if (isDefiniteNonDelivery(sendResult)) {
      await finish({
        status: 'failed',
        failureReason: sendResult.reason ?? 'unknown',
        sendAttemptedAt: null,
        attempts: { increment: 1 },
      });
      result.failed += 1;
      result.failed_enrollment_ids.push(enrolment.id);
    } else {
      await finish({ status: 'ambiguous', failureReason: sendResult.reason ?? 'unknown', attempts: { increment: 1 } });
      result.failed += 1;
      result.ambiguous += 1;
      result.failed_enrollment_ids.push(enrolment.id);
    }
  }

  let after: { completedAt: Date; id: string } | null = null;
  for (let page = 0; page < MAX_PAGES && !capReached(); page += 1) {
    // Only rows that still need work: no ledger row, a retryable definite failure, or a pending
    // claim whose lease expired. Terminal rows never crowd later learners out of a page.
    const candidates: Candidate[] = await prisma.lmsEnrollment.findMany({
      where: {
        status: 'completed',
        completedAt: { gte: window.from, lte: window.to },
        OR: [
          { reviewRequestEmail: { is: null } },
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
          select: { status: true, attempts: true, claimToken: true, sendAttemptedAt: true, updatedAt: true },
        },
      },
    });
    if (candidates.length === 0) break;
    result.candidates += candidates.length;
    const last = candidates[candidates.length - 1]!;
    after = { completedAt: last.completedAt!, id: last.id };
    for (const enrolment of candidates) {
      if (capReached()) break;
      await processCandidate(enrolment);
    }
    if (candidates.length < PAGE_SIZE) break;
  }

  result.ok = result.failed === 0;
  return result;
}
