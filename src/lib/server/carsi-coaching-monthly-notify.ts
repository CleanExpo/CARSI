import { sendEmail } from '@/lib/server/email';
import { renderCarsiCoachingMonthlyFounderNotificationEmail } from '@/lib/server/email-templates';

const FOUNDER_NOTIFY_DEFAULT = 'phill.mcgurk@gmail.com';

function parseNotifyList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,;]/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));
}

/** Founder / ops inbox for new Business Coaching subscriptions. */
export function getCarsiCoachingMonthlyNotifyRecipients(): string[] {
  const fromEnv = parseNotifyList(process.env.CARSI_COACHING_MONTHLY_NOTIFY_EMAIL);
  if (fromEnv.length > 0) return fromEnv;
  return [FOUNDER_NOTIFY_DEFAULT];
}

export async function sendCarsiCoachingMonthlyFounderNotificationEmail(params: {
  appOrigin: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  carsiUserId: string;
  amountLabel: string;
  stripeCheckoutSessionId: string;
  stripeSubscriptionId?: string;
}) {
  const to = getCarsiCoachingMonthlyNotifyRecipients();
  if (to.length === 0) return { sent: false, reason: 'not_configured' as const };

  const { html, text } = renderCarsiCoachingMonthlyFounderNotificationEmail(params);

  return sendEmail({
    to,
    subject: `[CARSI Business Coaching] New subscription — ${params.contactEmail}`,
    html,
    text,
  });
}
