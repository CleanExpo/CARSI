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
 * lms_review_request_emails. A run claims the row (INSERT pending) before sending; a row becomes
 * `sent` only when the provider actually accepted the message. A failed send is retried on a
 * later run (max 3 attempts) instead of silently using up the learner's only ask.
 */

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
/** Candidate rows read per run (sends are capped separately). */
const CANDIDATE_LIMIT = 500;

export type ReviewRequestConfig =
  | { enabled: true; since: Date }
  | { enabled: false; reason: 'disabled' | 'since_missing' | 'since_invalid' };

/** Pure: parse the two env vars. Only the exact string "true" enables sending. */
export function readReviewRequestConfig(env: Record<string, string | undefined>): ReviewRequestConfig {
  if (env.REVIEW_REQUEST_EMAILS_ENABLED !== 'true') return { enabled: false, reason: 'disabled' };
  const raw = env.REVIEW_REQUEST_EMAILS_SINCE?.trim();
  if (!raw) return { enabled: false, reason: 'since_missing' };
  if (!/^\d{4}-\d{2}-\d{2}(?:T[\d:.]+(?:Z|[+-]\d{2}:?\d{2})?)?$/.test(raw)) {
    return { enabled: false, reason: 'since_invalid' };
  }
  const since = new Date(raw);
  if (Number.isNaN(since.getTime())) return { enabled: false, reason: 'since_invalid' };
  return { enabled: true, since };
}

/** Pure: the completed_at window a run considers — on/after SINCE, and 3 to 14 days old. */
export function reviewRequestWindow(since: Date, now: Date): { from: Date; to: Date } {
  const oldest = new Date(now.getTime() - REVIEW_REQUEST_MAX_AGE_DAYS * DAY_MS);
  return {
    from: since.getTime() > oldest.getTime() ? since : oldest,
    to: new Date(now.getTime() - REVIEW_REQUEST_MIN_AGE_DAYS * DAY_MS),
  };
}

/** Pure: did the provider really accept the message? `dev_console` only printed it. */
export function wasReallySent(result: SendEmailResult): boolean {
  return result.sent === true && result.reason !== 'dev_console';
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
  const unsubscribeUrl = buildUnsubscribeUrl(appOrigin, await signEmailUnsubscribeToken(params.userId));
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
      'List-Unsubscribe': `<${unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  });
}

export type ReviewRequestSkipReason =
  | 'onboarding_course'
  | 'already_handled'
  | 'in_flight'
  | 'attempts_exhausted'
  | 'claimed_elsewhere'
  | 'same_learner_this_run'
  | 'already_reviewed'
  | 'opted_out'
  | 'no_email'
  | 'inactive_account';

export type ReviewRequestRunResult = {
  ok: boolean;
  /** Why nothing was attempted, when nothing was (never conflated with "nobody eligible"). */
  reason?: 'disabled' | 'since_missing' | 'since_invalid' | 'email_not_configured';
  dry_run: boolean;
  window?: { from: string; to: string };
  candidates: number;
  would_send: number;
  sent: number;
  failed: number;
  skipped: Partial<Record<ReviewRequestSkipReason, number>>;
  /** Enrolment ids whose send failed this run (never email addresses — PII stays out of logs). */
  failed_enrollment_ids: string[];
};

function isUniqueViolation(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: string }).code === 'P2002';
}

/**
 * One run of the review-request job. `dryRun` reads and counts but writes and sends nothing.
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
    skipped: {},
    failed_enrollment_ids: [],
  };
  if (!config.enabled) return { ...base, reason: config.reason };
  if (!dryRun && !isEmailConfigured()) return { ...base, ok: false, reason: 'email_not_configured' };

  const window = reviewRequestWindow(config.since, now);
  const result: ReviewRequestRunResult = {
    ...base,
    window: { from: window.from.toISOString(), to: window.to.toISOString() },
  };
  const skip = (r: ReviewRequestSkipReason) => {
    result.skipped[r] = (result.skipped[r] ?? 0) + 1;
  };

  const candidates = await prisma.lmsEnrollment.findMany({
    where: { status: 'completed', completedAt: { gte: window.from, lte: window.to } },
    orderBy: { completedAt: 'asc' },
    take: CANDIDATE_LIMIT,
    select: {
      id: true,
      studentId: true,
      courseId: true,
      course: { select: { slug: true, title: true, category: true } },
      reviewRequestEmail: { select: { status: true, attempts: true } },
    },
  });
  result.candidates = candidates.length;

  const learnersThisRun = new Set<string>();
  for (const enrolment of candidates) {
    if (result.sent + result.failed + result.would_send >= REVIEW_REQUEST_MAX_SENDS_PER_RUN) break;

    if (isOnboardingCourse({ slug: enrolment.course.slug, category: enrolment.course.category })) {
      skip('onboarding_course');
      continue;
    }
    const ledger = enrolment.reviewRequestEmail;
    if (ledger?.status === 'sent' || ledger?.status === 'skipped') {
      skip('already_handled');
      continue;
    }
    if (ledger?.status === 'pending') {
      skip('in_flight');
      continue;
    }
    if (ledger?.status === 'failed' && ledger.attempts >= REVIEW_REQUEST_MAX_ATTEMPTS) {
      skip('attempts_exhausted');
      continue;
    }
    if (learnersThisRun.has(enrolment.studentId)) {
      skip('same_learner_this_run');
      continue;
    }

    if (dryRun) {
      learnersThisRun.add(enrolment.studentId);
      result.would_send += 1;
      continue;
    }

    // Claim the enrolment. The UNIQUE key makes a concurrent run's INSERT fail (P2002), and the
    // conditional retry claim can be won by only one run.
    try {
      if (!ledger) {
        await prisma.lmsReviewRequestEmail.create({ data: { enrollmentId: enrolment.id, status: 'pending' } });
      } else {
        const claimed = await prisma.lmsReviewRequestEmail.updateMany({
          where: { enrollmentId: enrolment.id, status: 'failed', attempts: { lt: REVIEW_REQUEST_MAX_ATTEMPTS } },
          data: { status: 'pending' },
        });
        if (claimed.count === 0) {
          skip('claimed_elsewhere');
          continue;
        }
      }
    } catch (e) {
      if (isUniqueViolation(e)) {
        skip('claimed_elsewhere');
        continue;
      }
      throw e;
    }
    learnersThisRun.add(enrolment.studentId);

    const finish = (data: {
      status: 'sent' | 'failed' | 'skipped';
      failureReason?: string | null;
      providerMessageId?: string | null;
      sentAt?: Date | null;
      countAttempt: boolean;
    }) =>
      prisma.lmsReviewRequestEmail.update({
        where: { enrollmentId: enrolment.id },
        data: {
          status: data.status,
          failureReason: data.failureReason ?? null,
          providerMessageId: data.providerMessageId ?? null,
          sentAt: data.sentAt ?? null,
          ...(data.countAttempt ? { attempts: { increment: 1 } } : {}),
        },
      });

    // Re-read consent and review state immediately before sending (Spam Act; ask once).
    const [learner, review] = await Promise.all([
      prisma.lmsUser.findUnique({
        where: { id: enrolment.studentId },
        select: { email: true, fullName: true, emailOptOut: true, isActive: true },
      }),
      prisma.lmsCourseReview.findUnique({
        where: { courseId_studentId: { courseId: enrolment.courseId, studentId: enrolment.studentId } },
        select: { id: true },
      }),
    ]);
    const terminalSkip: ReviewRequestSkipReason | null = review
      ? 'already_reviewed'
      : !learner || !learner.isActive
        ? 'inactive_account'
        : learner.emailOptOut
          ? 'opted_out'
          : !learner.email?.trim()
            ? 'no_email'
            : null;
    if (terminalSkip || !learner) {
      await finish({ status: 'skipped', failureReason: terminalSkip ?? 'inactive_account', countAttempt: false });
      skip(terminalSkip ?? 'inactive_account');
      continue;
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
        providerMessageId: sendResult.messageId ?? null,
        sentAt: now,
        countAttempt: true,
      });
      result.sent += 1;
    } else {
      await finish({ status: 'failed', failureReason: sendResult.reason ?? 'unknown', countAttempt: true });
      result.failed += 1;
      result.failed_enrollment_ids.push(enrolment.id);
    }
  }

  result.ok = result.failed === 0;
  return result;
}
