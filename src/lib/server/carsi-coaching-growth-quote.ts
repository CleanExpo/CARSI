import type { SessionClaims } from '@/lib/auth/session-jwt';
import { findGrowthServiceById } from '@/lib/coaching-portal/growth-services';
import { carsiCoachingPortalPath } from '@/lib/marketing/carsi-coaching-program';
import { prisma } from '@/lib/prisma';
import { getAppOrigin } from '@/lib/server/app-url';
import { getCarsiCoachingMonthlyNotifyRecipients } from '@/lib/server/carsi-coaching-monthly-notify';
import { sendEmail } from '@/lib/server/email';
import {
  renderCoachingGrowthQuoteCoachEmail,
  renderCoachingGrowthQuoteMemberEmail,
} from '@/lib/server/email-templates';

const MIN_MESSAGE = 10;

export async function submitCoachingGrowthQuoteRequest(
  claims: SessionClaims,
  input: { serviceId: string; message: string }
): Promise<{ ok: true } | { ok: false; detail: string }> {
  const match = findGrowthServiceById(input.serviceId);
  if (!match) {
    return { ok: false, detail: 'Unknown service.' };
  }

  const message = input.message.trim();
  if (message.length < MIN_MESSAGE) {
    return {
      ok: false,
      detail: `Please add a short note (${MIN_MESSAGE}+ characters) so we can quote accurately.`,
    };
  }

  const profile = await prisma.carsiCoachingBusinessProfile.findUnique({
    where: { userId: claims.sub },
    select: { businessName: true },
  });

  const memberName = claims.full_name?.trim() || claims.email;
  const businessName = profile?.businessName?.trim() || memberName;
  const appOrigin = getAppOrigin();
  const portalUrl = `${appOrigin.replace(/\/$/, '')}${carsiCoachingPortalPath}/services`;

  const coachEmail = renderCoachingGrowthQuoteCoachEmail({
    appOrigin,
    businessName,
    memberName,
    memberEmail: claims.email,
    categoryTitle: match.category.title,
    serviceTitle: match.item.title,
    rateLabel: match.item.rateLabel,
    message,
    portalUrl,
  });

  await sendEmail({
    to: getCarsiCoachingMonthlyNotifyRecipients(),
    subject: `[CARSI Growth] Quote request — ${match.item.title} — ${businessName}`,
    html: coachEmail.html,
    text: coachEmail.text,
    replyTo: claims.email,
  });

  const memberEmail = renderCoachingGrowthQuoteMemberEmail({
    appOrigin,
    name: memberName.split(/\s+/)[0] || 'there',
    serviceTitle: match.item.title,
    rateLabel: match.item.rateLabel,
    portalUrl,
  });

  await sendEmail({
    to: [claims.email],
    subject: `Quote request received — ${match.item.title}`,
    html: memberEmail.html,
    text: memberEmail.text,
  });

  return { ok: true };
}
