/**
 * Phase B — IICRC recertification reminders.
 *
 * A daily cron scans active users with an IICRC expiry date and creates idempotent in-app
 * notifications (plus a branded email) at three milestones before/after expiry. Recert is a
 * compliance concern, so email is always sent (no marketing opt-out applies).
 *
 * The recert due date is `LmsUser.iicrcExpiryDate` (there is no per-enrollment expiry). The
 * milestone-selection and dedupe-key logic are pure functions so they can be unit-tested without
 * a database, matching the repo convention.
 */

import { getAppOrigin } from '@/lib/server/app-url';
import { isEmailConfigured } from '@/lib/server/email';
import { createNotification } from '@/lib/server/notifications';
import { prisma } from '@/lib/prisma';
import { sendRecertReminderEmail } from '@/lib/server/transactional-email';

export type RecertMilestone = 't_minus_30' | 't_minus_7' | 'overdue';

const MS_PER_DAY = 86_400_000;

/** In-app + email link target — the IICRC credentials/renewal surface. */
export const RECERT_LINK = '/dashboard/credentials';

/** Pure: whole days until `expiry` (0 or negative once expired). Ceil matches renewal-summary.ts. */
export function daysUntilExpiry(expiry: Date, now: Date): number {
  return Math.ceil((expiry.getTime() - now.getTime()) / MS_PER_DAY);
}

/** Pure: which reminder milestone (if any) a days-until-expiry value falls into. */
export function pickRecertMilestone(days: number): RecertMilestone | null {
  if (days <= 0) return 'overdue';
  if (days <= 7) return 't_minus_7';
  if (days <= 30) return 't_minus_30';
  return null;
}

/** Pure: idempotency key — one notification per user, per expiry cycle, per milestone. */
export function recertDedupeKey(userId: string, expiry: Date, milestone: RecertMilestone): string {
  return `recert:${userId}:${expiry.toISOString().slice(0, 10)}:${milestone}`;
}

/** Pure: in-app notification title + body for a milestone. */
export function recertContent(
  milestone: RecertMilestone,
  expiry: Date,
  days: number,
): { title: string; body: string } {
  const dateStr = expiry.toISOString().slice(0, 10);
  if (milestone === 'overdue') {
    return {
      title: 'Your IICRC certification has expired',
      body: `Your IICRC certification expired on ${dateStr}. Renew now to stay compliant — complete CEC-eligible courses and submit your renewal.`,
    };
  }
  if (milestone === 't_minus_7') {
    return {
      title: `IICRC certification expires in ${days} day${days === 1 ? '' : 's'}`,
      body: `Your IICRC certification expires on ${dateStr}. Finish any outstanding CEC hours and submit your renewal this week to avoid a lapse.`,
    };
  }
  return {
    title: `IICRC certification renewal due soon (${dateStr})`,
    body: `Your IICRC certification expires on ${dateStr}. Plan your CEC-eligible courses now so your renewal is ready well ahead of time.`,
  };
}

export type RecertRunResult = {
  eligible: number;
  due: number;
  dispatched: number;
  failures: Array<{ userId: string; reason: string }>;
};

/**
 * Scan active users with an IICRC expiry date and dispatch due recert reminders (in-app + email).
 * Idempotent: `createNotification` upserts on the milestone dedupe key, so re-running the same day
 * (or the same milestone within a cycle) never duplicates. Email fires only on a fresh create.
 */
export async function runRecertReminders(now: Date = new Date()): Promise<RecertRunResult> {
  const users = await prisma.lmsUser.findMany({
    where: { isActive: true, iicrcExpiryDate: { not: null } },
    select: { id: true, email: true, fullName: true, iicrcExpiryDate: true },
  });

  const appOrigin = getAppOrigin();
  const emailOn = isEmailConfigured();
  let due = 0;
  let dispatched = 0;
  const failures: Array<{ userId: string; reason: string }> = [];

  for (const user of users) {
    const expiry = user.iicrcExpiryDate;
    if (!expiry) continue;
    const days = daysUntilExpiry(expiry, now);
    const milestone = pickRecertMilestone(days);
    if (!milestone) continue;
    due += 1;

    const { title, body } = recertContent(milestone, expiry, days);
    try {
      const { created } = await createNotification({
        userId: user.id,
        type: 'recert_due',
        title,
        body,
        linkUrl: RECERT_LINK,
        dedupeKey: recertDedupeKey(user.id, expiry, milestone),
      });
      if (created) {
        dispatched += 1;
        if (emailOn && user.email) {
          await sendRecertReminderEmail({
            to: user.email,
            name: user.fullName?.trim() || user.email.split('@')[0],
            expiryDate: expiry.toISOString().slice(0, 10),
            milestone,
            appOrigin,
          }).catch((e) => console.error('[recert-reminders] email failed', user.id, e));
        }
      }
    } catch (e) {
      failures.push({ userId: user.id, reason: e instanceof Error ? e.message : 'unknown' });
    }
  }

  return { eligible: users.length, due, dispatched, failures };
}
