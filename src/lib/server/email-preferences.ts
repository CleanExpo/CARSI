/**
 * Email preference service — backs the in-app settings toggle and the
 * token-authenticated one-click unsubscribe link in drip emails.
 *
 * The single source of truth is `LmsUser.emailOptOut` (Spam Act suppression flag,
 * checked by `toolbox-drip.ts` before sending). The URL builder is pure so it can
 * be unit-tested without a database, matching the repo's test convention.
 */

import { prisma } from '@/lib/prisma';

export type EmailPreferences = {
  /** true = the user has opted out of non-transactional emails (drip, digests). */
  email_opt_out: boolean;
};

/** Current preference for a user; defaults to opted-in when the row/column is absent. */
export async function getEmailPreferences(userId: string): Promise<EmailPreferences> {
  const user = await prisma.lmsUser.findUnique({
    where: { id: userId },
    select: { emailOptOut: true },
  });
  return { email_opt_out: user?.emailOptOut ?? false };
}

/** Set the opt-out flag; returns the persisted preference. */
export async function setEmailOptOut(
  userId: string,
  optedOut: boolean
): Promise<EmailPreferences> {
  const user = await prisma.lmsUser.update({
    where: { id: userId },
    data: { emailOptOut: optedOut },
    select: { emailOptOut: true },
  });
  return { email_opt_out: user.emailOptOut };
}

/** Pure: build the public one-click unsubscribe URL for an email footer. */
export function buildUnsubscribeUrl(appOrigin: string, token: string): string {
  const base = appOrigin.replace(/\/$/, '');
  return `${base}/unsubscribe?token=${encodeURIComponent(token)}`;
}
