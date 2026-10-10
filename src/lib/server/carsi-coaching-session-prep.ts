import type { SessionClaims } from '@/lib/auth/session-jwt';
import { carsiCoachingPortalPath } from '@/lib/marketing/carsi-coaching-program';
import { prisma } from '@/lib/prisma';
import { getAppOrigin } from '@/lib/server/app-url';
import { getCarsiCoachingMonthlyNotifyRecipients } from '@/lib/server/carsi-coaching-monthly-notify';
import {
  getCoachingPortalRowForUser,
  updateCoachingPortalWorkspace,
  workspaceFromRow,
} from '@/lib/server/carsi-coaching-subscription-store';
import { sendEmail } from '@/lib/server/email';
import { renderCoachingSessionPrepCoachEmail } from '@/lib/server/email-templates';

const MIN_PREP_LENGTH = 15;

export async function saveCoachingSessionPrep(
  claims: SessionClaims,
  input: { notes: string; notifyCoach: boolean }
): Promise<{ ok: true; savedAt: string } | { ok: false; detail: string }> {
  const notes = input.notes.trim();
  if (notes.length < MIN_PREP_LENGTH) {
    return {
      ok: false,
      detail: `Add at least ${MIN_PREP_LENGTH} characters so Phill can prepare.`,
    };
  }

  const row = await getCoachingPortalRowForUser(claims.sub);
  if (!row) {
    return { ok: false, detail: 'Active coaching subscription required.' };
  }

  const current = workspaceFromRow(row);
  await updateCoachingPortalWorkspace(claims.sub, {
    ...current,
    sessionPrepNotes: notes,
  });

  const profile = await prisma.carsiCoachingBusinessProfile.findUnique({
    where: { userId: claims.sub },
    select: { businessName: true },
  });

  if (input.notifyCoach) {
    const memberName = claims.full_name?.trim() || claims.email;
    const businessName = profile?.businessName?.trim() || memberName;
    const appOrigin = getAppOrigin();
    const portalUrl = `${appOrigin.replace(/\/$/, '')}${carsiCoachingPortalPath}/sessions`;

    const coachEmail = renderCoachingSessionPrepCoachEmail({
      appOrigin,
      businessName,
      memberName,
      memberEmail: claims.email,
      prepNotes: notes,
      portalUrl,
    });

    await sendEmail({
      to: getCarsiCoachingMonthlyNotifyRecipients(),
      subject: `[CARSI Coaching] Session prep — ${businessName}`,
      html: coachEmail.html,
      text: coachEmail.text,
      replyTo: claims.email,
    });
  }

  return { ok: true, savedAt: new Date().toISOString() };
}
