/**
 * GP-635 — e-mail templates and the mailer for accountability nudges and coach alerts.
 *
 * Nothing here sends on its own. The scheduled route only builds this mailer when both
 * accountability flags are exactly "true"; otherwise it runs dry and this file is unused.
 */
import {
  ACCOUNTABILITY_COPY,
  type CoachAlert,
  type MemberNudge,
} from '@/lib/coaching-portal/accountability';
import { coachingPortalPath } from '@/lib/coaching-portal/coaching-portal-paths';
import { sendEmail } from '@/lib/server/email';
import { buildCarsiEmailHtml, type RenderedEmail } from '@/lib/server/email-templates';
import type {
  AccountabilityMailer,
  AccountabilityMemberRecord,
} from '@/lib/server/carsi-coaching-accountability';

const COPY = ACCOUNTABILITY_COPY.email;
const TAGLINE = 'Business Coaching';

function formatDue(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Australia/Brisbane',
  });
}

export function renderMemberNudgeEmail(params: {
  appOrigin: string;
  firstName: string;
  nudges: MemberNudge[];
}): RenderedEmail & { subject: string } {
  const quiet = params.nudges.find((n) => n.kind === 'quiet');
  const checkIn = params.nudges.find((n) => n.kind === 'checkin_due');
  const actionLines = params.nudges.flatMap((n) =>
    n.kind === 'action_overdue'
      ? [`${n.title} (overdue, was due ${formatDue(n.dueDate)})`]
      : n.kind === 'action_due_soon'
        ? [`${n.title} (due ${formatDue(n.dueDate)})`]
        : []
  );

  const paragraphs: string[] = [];
  let subject: string = COPY.actionsSubject;
  if (quiet && quiet.kind === 'quiet') {
    subject = COPY.quietSubject;
    paragraphs.push(COPY.quietBody(params.firstName, quiet.daysSilent));
  } else if (checkIn) {
    subject = COPY.checkInSubject;
    paragraphs.push(COPY.checkInBody(params.firstName));
  }
  if (actionLines.length > 0) {
    paragraphs.push(COPY.actionsIntro(params.firstName), ...actionLines.map((l) => `- ${l}`));
  }
  paragraphs.push(COPY.footer);

  const href = `${params.appOrigin}${coachingPortalPath('/progress')}`;
  const html = buildCarsiEmailHtml({
    appOrigin: params.appOrigin,
    preheader: subject,
    eyebrow: 'Business Coaching',
    title: subject,
    paragraphs,
    cta: { label: COPY.cta, href },
    headerTagline: TAGLINE,
  });
  return { subject, html, text: `${paragraphs.join('\n\n')}\n\n${COPY.cta}: ${href}` };
}

export function renderCoachAlertEmail(params: {
  appOrigin: string;
  memberLabel: string;
  alerts: CoachAlert[];
}): RenderedEmail & { subject: string } {
  const lines = params.alerts.map((a) =>
    a.kind === 'silent'
      ? COPY.coachSilent(params.memberLabel, a.daysSilent)
      : COPY.coachBlocked(params.memberLabel, a.blockedCount)
  );
  const href = `${params.appOrigin}/admin/coaching-accountability`;
  const html = buildCarsiEmailHtml({
    appOrigin: params.appOrigin,
    preheader: COPY.coachSubject,
    eyebrow: 'Coach alert',
    title: COPY.coachSubject,
    paragraphs: lines,
    cta: { label: COPY.coachCta, href },
    headerTagline: TAGLINE,
  });
  return { subject: COPY.coachSubject, html, text: `${lines.join('\n')}\n\n${href}` };
}

export function createAccountabilityMailer(deps: {
  appOrigin: string;
  coachRecipients: string[];
}): AccountabilityMailer {
  return {
    async sendMemberNudges(member: AccountabilityMemberRecord, nudges: MemberNudge[]) {
      const email = renderMemberNudgeEmail({
        appOrigin: deps.appOrigin,
        firstName: member.firstName?.trim() || 'there',
        nudges,
      });
      const res = await sendEmail({
        to: member.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });
      return res.sent;
    },
    async sendCoachAlerts(member: AccountabilityMemberRecord, alerts: CoachAlert[]) {
      if (deps.coachRecipients.length === 0) return false;
      const email = renderCoachAlertEmail({
        appOrigin: deps.appOrigin,
        memberLabel: member.label,
        alerts,
      });
      const res = await sendEmail({
        to: deps.coachRecipients,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });
      return res.sent;
    },
  };
}
