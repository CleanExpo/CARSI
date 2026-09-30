import { signEmailUnsubscribeToken } from '@/lib/auth/session-jwt';
import { prisma } from '@/lib/prisma';
import { getAppOrigin } from '@/lib/server/app-url';
import { isEmailConfigured, sendEmail } from '@/lib/server/email';
import { buildUnsubscribeUrl } from '@/lib/server/email-preferences';
import { renderAdminMarketingEmail } from '@/lib/server/email-templates';
import {
  marketingHtmlToPlainText,
  sanitizeMarketingEmailBodyHtml,
} from '@/lib/server/marketing-email-html';

export const MAX_MARKETING_RECIPIENTS = 80;
export const MAX_MARKETING_SUBJECT = 120;
export const MAX_MARKETING_BODY = 8_000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

export function resolveMarketingImageUrl(
  appOrigin: string,
  raw: string | null | undefined
): string | null {
  const u = raw?.trim() ?? '';
  if (!u) return null;
  const origin = appOrigin.replace(/\/$/, '');
  if (u.startsWith('/uploads/')) return `${origin}${u}`;
  let parsed: URL;
  try {
    parsed = new URL(u);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:') return null;
  const host = parsed.hostname.toLowerCase();
  if (host === 'res.cloudinary.com' || host.endsWith('.cloudinary.com')) return parsed.toString();
  const originHost = new URL(
    origin.startsWith('http') ? origin : `https://${origin}`
  ).hostname.toLowerCase();
  if (host === originHost || host === 'carsi.com.au' || host === 'www.carsi.com.au') {
    return parsed.toString();
  }
  return null;
}

export type MarketingSendResult = {
  sent: number;
  skippedOptOut: number;
  failed: number;
  errors: string[];
};

export async function sendAdminMarketingEmails(input: {
  userIds: string[];
  subject: string;
  body: string;
  bodyHtml?: string | null;
  imageUrl?: string | null;
}): Promise<MarketingSendResult> {
  if (!isEmailConfigured()) {
    throw new Error('EMAIL_NOT_CONFIGURED');
  }

  const subject = input.subject.trim();
  let bodyHtml: string | null = null;
  let bodyPlain = input.body.trim();
  if (input.bodyHtml?.trim()) {
    try {
      bodyHtml = sanitizeMarketingEmailBodyHtml(input.bodyHtml);
      bodyPlain = marketingHtmlToPlainText(bodyHtml);
    } catch {
      throw new Error('INVALID_BODY_HTML');
    }
  }
  if (!bodyPlain || bodyPlain.length > MAX_MARKETING_BODY) {
    throw new Error('INVALID_BODY');
  }
  if (!subject || subject.length > MAX_MARKETING_SUBJECT) {
    throw new Error('INVALID_SUBJECT');
  }

  const ids = [...new Set(input.userIds.map((id) => id.trim()).filter(isUuid))];
  if (ids.length === 0) throw new Error('NO_RECIPIENTS');
  if (ids.length > MAX_MARKETING_RECIPIENTS) throw new Error('TOO_MANY_RECIPIENTS');

  const appOrigin = getAppOrigin();
  const imageUrl = resolveMarketingImageUrl(appOrigin, input.imageUrl);

  const users = await prisma.lmsUser.findMany({
    where: { id: { in: ids }, isActive: true },
    select: { id: true, email: true, fullName: true, emailOptOut: true },
  });

  let sent = 0;
  let skippedOptOut = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const user of users) {
    if (user.emailOptOut) {
      skippedOptOut += 1;
      continue;
    }
    const name = user.fullName?.trim() || user.email.split('@')[0];
    const unsubscribeUrl = buildUnsubscribeUrl(appOrigin, await signEmailUnsubscribeToken(user.id));
    const { html, text } = renderAdminMarketingEmail({
      appOrigin,
      name,
      title: subject,
      body: bodyPlain,
      bodyHtml,
      imageUrl,
      unsubscribeUrl,
    });
    const result = await sendEmail({
      to: user.email,
      subject,
      html,
      text,
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    });
    if (result.sent) sent += 1;
    else {
      failed += 1;
      errors.push(user.email);
    }
  }

  return { sent, skippedOptOut, failed, errors };
}
