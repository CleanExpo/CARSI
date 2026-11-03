import type { SessionClaims } from '@/lib/auth/session-jwt';
import { COACHING_SESSION_PREP_MIN_LENGTH } from '@/lib/coaching-portal/session-prep';
import { carsiCoachingPortalPath } from '@/lib/marketing/carsi-coaching-program';
import { prisma } from '@/lib/prisma';
import { getAppOrigin } from '@/lib/server/app-url';
import { getCoachRoutingForMember } from '@/lib/server/carsi-coaching-coaches';
import {
  getCoachingPortalRowForUser,
  updateCoachingPortalWorkspace,
  workspaceFromRow,
} from '@/lib/server/carsi-coaching-subscription-store';
import { sendEmail } from '@/lib/server/email';
import { renderCoachingSessionPrepCoachEmail } from '@/lib/server/email-templates';

export async function persistCoachingSessionPrepNotes(
  userId: string,
  notes: string
): Promise<void> {
  const row = await getCoachingPortalRowForUser(userId);
  if (row) {
    const current = workspaceFromRow(row);
    await updateCoachingPortalWorkspace(userId, {
      ...current,
      sessionPrepNotes: notes,
    });
    return;
  }

  await prisma.carsiCoachingBusinessProfile.upsert({
    where: { userId },
    create: { userId, sessionPrepNotes: notes },
    update: { sessionPrepNotes: notes },
  });
}

export async function readCoachingSessionPrepNotes(userId: string): Promise<string> {
  const [row, profile] = await Promise.all([
    getCoachingPortalRowForUser(userId),
    prisma.carsiCoachingBusinessProfile.findUnique({
      where: { userId },
      select: { sessionPrepNotes: true },
    }),
  ]);

  const fromSubscription = row ? workspaceFromRow(row).sessionPrepNotes.trim() : '';
  if (fromSubscription) return fromSubscription;
  return profile?.sessionPrepNotes?.trim() ?? '';
}

export async function saveCoachingSessionPrep(
  claims: SessionClaims,
  input: { notes: string; notifyCoach: boolean }
): Promise<{ ok: true; savedAt: string } | { ok: false; detail: string }> {
  const notes = input.notes.trim();
  if (notes.length < COACHING_SESSION_PREP_MIN_LENGTH) {
    return {
      ok: false,
      detail: `Add at least ${COACHING_SESSION_PREP_MIN_LENGTH} characters so ${
        (await getCoachRoutingForMember(claims.sub)).coachName
      } can prepare.`,
    };
  }

  // Resolve the coach before saving, so unknown routing changes nothing.
  const coachRecipients = input.notifyCoach
    ? (await getCoachRoutingForMember(claims.sub)).recipients
    : [];

  await persistCoachingSessionPrepNotes(claims.sub, notes);

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
      to: coachRecipients,
      subject: `[CARSI Coaching] Session prep — ${businessName}`,
      html: coachEmail.html,
      text: coachEmail.text,
      replyTo: claims.email,
    });
  }

  return { ok: true, savedAt: new Date().toISOString() };
}
