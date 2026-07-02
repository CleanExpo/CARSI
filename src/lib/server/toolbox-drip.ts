/**
 * Phase C — monthly Toolbox-Talk drip.
 *
 * On the 1st of each month a cron picks that month's talk by rotating over the Toolbox-Talks
 * course modules (ordered by `orderIndex`) and creates an idempotent in-app notification (plus a
 * branded email) for each active user enrolled in a drip course. The drip is marketing-style, so
 * the email respects the Spam-Act opt-out (`LmsUser.emailOptOut`); the in-app notification always
 * lands. Rotation + keying are pure functions so they can be unit-tested without a database.
 */

import { getAppOrigin } from '@/lib/server/app-url';
import { isEmailConfigured } from '@/lib/server/email';
import { createNotification } from '@/lib/server/notifications';
import { prisma } from '@/lib/prisma';
import { sendToolboxTalkEmail } from '@/lib/server/transactional-email';

/** The Toolbox-Talks course (resolved by slug at runtime — it lives only in the live DB). */
export const TOOLBOX_COURSE_SLUG = 'carsi-maintenance-toolbox-talks-monthly-refreshers';
/** Courses whose active enrollees receive the drip (add the Maintenance slug here if desired). */
export const DRIP_COURSE_SLUGS = [TOOLBOX_COURSE_SLUG];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Pure: rotate over `count` talks by absolute month, so each calendar month maps to a stable talk. */
export function monthlyTalkIndex(year: number, month1to12: number, count: number): number {
  if (count <= 0) return 0;
  const abs = year * 12 + (month1to12 - 1);
  return ((abs % count) + count) % count;
}

/** Pure: YYYY-MM period label (UTC). */
export function periodKey(now: Date): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Pure: idempotency key — one drip per user, per month, per talk. */
export function dripDedupeKey(userId: string, period: string, moduleId: string): string {
  return `toolbox:${period}:${moduleId}:${userId}`;
}

/** Pure: in-app notification content for a month's talk. */
export function dripContent(
  talkTitle: string,
  monthLabel: string,
): { title: string; body: string } {
  return {
    title: `${monthLabel} Toolbox Talk: ${talkTitle}`,
    body: `This month's toolbox talk is ready: "${talkTitle}". A quick refresher to run with your crew — the hazard, the control, and the sign-off.`,
  };
}

export type DripRunResult = {
  talk: string | null;
  recipients: number;
  dispatched: number;
  emailed: number;
  failures: Array<{ userId: string; reason: string }>;
};

/**
 * Pick this month's talk and notify every active drip-course enrollee (idempotent).
 * In-app always; email only when configured and the user has not opted out.
 */
export async function runToolboxDrip(now: Date = new Date()): Promise<DripRunResult> {
  const course = await prisma.lmsCourse.findUnique({
    where: { slug: TOOLBOX_COURSE_SLUG },
    include: { modules: { orderBy: { orderIndex: 'asc' }, select: { id: true, title: true } } },
  });
  if (!course || course.modules.length === 0) {
    return { talk: null, recipients: 0, dispatched: 0, emailed: 0, failures: [] };
  }

  const idx = monthlyTalkIndex(now.getUTCFullYear(), now.getUTCMonth() + 1, course.modules.length);
  const talk = course.modules[idx];
  const period = periodKey(now);
  const monthLabel = `${MONTHS[now.getUTCMonth()]} ${now.getUTCFullYear()}`;
  const { title, body } = dripContent(talk.title, monthLabel);

  const enrollments = await prisma.lmsEnrollment.findMany({
    where: { course: { slug: { in: DRIP_COURSE_SLUGS } }, student: { isActive: true } },
    select: {
      studentId: true,
      student: { select: { email: true, fullName: true, emailOptOut: true } },
    },
  });
  const recipients = new Map<
    string,
    { email: string | null; fullName: string | null; emailOptOut: boolean }
  >();
  for (const e of enrollments) {
    if (!recipients.has(e.studentId)) recipients.set(e.studentId, e.student);
  }

  const appOrigin = getAppOrigin();
  const emailOn = isEmailConfigured();
  const linkUrl = `/courses/${TOOLBOX_COURSE_SLUG}`;
  let dispatched = 0;
  let emailed = 0;
  const failures: Array<{ userId: string; reason: string }> = [];

  for (const [userId, student] of recipients) {
    try {
      const { created } = await createNotification({
        userId,
        type: 'toolbox_talk',
        title,
        body,
        linkUrl,
        dedupeKey: dripDedupeKey(userId, period, talk.id),
      });
      if (created) {
        dispatched += 1;
        if (emailOn && student.email && !student.emailOptOut) {
          try {
            await sendToolboxTalkEmail({
              to: student.email,
              name: student.fullName?.trim() || student.email.split('@')[0],
              talkTitle: talk.title,
              monthLabel,
              courseUrl: `${appOrigin.replace(/\/$/, '')}${linkUrl}`,
            });
            emailed += 1;
          } catch (err) {
            console.error('[toolbox-drip] email failed', userId, err);
          }
        }
      }
    } catch (e) {
      failures.push({ userId, reason: e instanceof Error ? e.message : 'unknown' });
    }
  }

  return { talk: talk.title, recipients: recipients.size, dispatched, emailed, failures };
}
