import type { BusinessCoachingSession } from '@/lib/marketing/business-coaching';
import { businessCoachingPath } from '@/lib/marketing/business-coaching';
import { sendEmail } from '@/lib/server/email';

function parseNotifyList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,;]/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));
}

export function getBusinessCoachingNotifyRecipients(): string[] {
  const fromEnv = parseNotifyList(process.env.BUSINESS_COACHING_NOTIFY_EMAIL);
  if (fromEnv.length > 0) return fromEnv;
  return parseNotifyList(process.env.SUPPORT_EMAIL);
}

export async function sendBusinessCoachingOrganizerNotificationEmail(params: {
  session: BusinessCoachingSession;
  registrationStatus: 'confirmed' | 'waitlisted';
  seatCount: number;
  packageLabel: string;
  companyName?: string;
  contactEmail: string;
  contactPhone?: string;
  attendees: string[];
  discussionTopic?: string;
  amountLabel: string;
  appOrigin: string;
}) {
  const to = getBusinessCoachingNotifyRecipients();
  if (to.length === 0) return { sent: false, reason: 'not_configured' as const };

  const base = params.appOrigin.replace(/\/$/, '');
  const lines = [
    `New Owner Circle booking (${params.registrationStatus})`,
    '',
    `Session: ${params.session.monthLabel} — ${params.session.dateLabel}`,
    `Package: ${params.packageLabel} (${params.seatCount} seats)`,
    `Paid: ${params.amountLabel}`,
    '',
    `Contact: ${params.contactEmail}`,
    params.contactPhone ? `Phone: ${params.contactPhone}` : '',
    params.companyName ? `Business: ${params.companyName}` : '',
    '',
    'Attendees:',
    ...params.attendees.map((n) => `  - ${n}`),
    params.discussionTopic ? `\nTopic they raised:\n${params.discussionTopic}` : '',
    '',
    `Admin: ${base}/admin/business-coaching`,
    `Public: ${base}${businessCoachingPath}`,
  ].filter(Boolean);

  return sendEmail({
    to,
    subject: `[Owner Circle] ${params.registrationStatus} — ${params.session.monthLabel}`,
    text: lines.join('\n'),
    html: `<pre style="font-family:ui-monospace,Menlo,monospace;font-size:13px;line-height:1.5">${lines
      .join('\n')
      .replace(/</g, '&lt;')}</pre>`,
  });
}
