/**
 * Single entry point for all CARSI transactional emails.
 * Uses branded templates from email-templates.ts and delivery from email.ts.
 */

import { prisma } from '@/lib/prisma';
import { getAppOrigin } from '@/lib/server/app-url';
import { isEmailConfigured, sendEmail, type SendEmailResult } from '@/lib/server/email';
import {
  renderCcwRoadshowBookingConfirmationEmail,
  renderContactNotificationEmail,
  renderContactReplyEmail,
  renderEnrollmentWelcomeEmail,
  renderPasswordResetEmail,
  renderRecertReminderEmail,
  renderRegistrationWelcomeEmail,
  renderAdminPasswordResetEmail,
  renderTeamMemberAddedEmail,
  renderYearlyMembershipEmail,
} from '@/lib/server/email-templates';
import { getFirstLessonLearnPath } from '@/lib/server/first-lesson';
import {
  buildRegistrationEmail,
  type RoadshowEmailKind,
} from '@/lib/server/ccw-roadshow-registration-email';

export { isEmailConfigured };
export type { SendEmailResult };

export async function sendPasswordResetEmail(params: {
  to: string;
  resetLink: string;
  fullName?: string | null;
  appOrigin: string;
}): Promise<SendEmailResult> {
  const name = params.fullName?.trim() || params.to.split('@')[0];
  const { html, text } = renderPasswordResetEmail({
    appOrigin: params.appOrigin,
    name,
    resetLink: params.resetLink,
  });

  return sendEmail({
    to: params.to,
    subject: 'Reset your CARSI password',
    html,
    text,
  });
}

export async function sendRegistrationWelcomeEmail(params: {
  to: string;
  fullName: string;
  dashboardUrl: string;
  appOrigin: string;
}): Promise<SendEmailResult> {
  const name = params.fullName.trim() || params.to.split('@')[0];
  const { html, text } = renderRegistrationWelcomeEmail({
    appOrigin: params.appOrigin,
    name,
    dashboardUrl: params.dashboardUrl,
  });

  return sendEmail({
    to: params.to,
    subject: 'Welcome to CARSI Learning',
    html,
    text,
  });
}

export async function sendRecertReminderEmail(params: {
  to: string;
  name: string;
  expiryDate: string;
  milestone: 't_minus_30' | 't_minus_7' | 'overdue';
  appOrigin: string;
}): Promise<SendEmailResult> {
  const base = params.appOrigin.replace(/\/$/, '');
  const renewalsUrl = `${base}/dashboard/credentials`;
  const { html, text } = renderRecertReminderEmail({
    appOrigin: params.appOrigin,
    name: params.name,
    expiryDate: params.expiryDate,
    milestone: params.milestone,
    renewalsUrl,
  });
  const subject =
    params.milestone === 'overdue'
      ? 'Your IICRC certification has expired'
      : `IICRC certification renewal due (expires ${params.expiryDate})`;
  return sendEmail({ to: params.to, subject, html, text });
}

export async function sendEnrollmentWelcomeEmail(params: {
  studentId: string;
  courseSlug: string;
  appOrigin: string;
}): Promise<SendEmailResult> {
  const { studentId, courseSlug, appOrigin } = params;
  const user = await prisma.lmsUser.findUnique({
    where: { id: studentId },
    select: { email: true, fullName: true },
  });
  const course = await prisma.lmsCourse.findUnique({
    where: { slug: courseSlug.trim().toLowerCase() },
    select: { title: true },
  });
  if (!user?.email || !course) {
    return { sent: false, reason: 'send_failed' };
  }

  const base = appOrigin.replace(/\/$/, '');
  const learnPath = (await getFirstLessonLearnPath(courseSlug)) ?? '/dashboard/student';
  const startUrl = `${base}${learnPath}`;
  const dashboardUrl = `${base}/dashboard/student`;
  const name = user.fullName?.trim() || user.email.split('@')[0];

  const { html, text } = renderEnrollmentWelcomeEmail({
    appOrigin: base,
    name,
    courseTitle: course.title,
    startUrl,
    dashboardUrl,
  });

  return sendEmail({
    to: user.email,
    subject: `You're enrolled — ${course.title}`,
    html,
    text,
  });
}

export async function sendTeamMemberAddedEmail(params: {
  to: string;
  memberName: string;
  inviterName: string;
  teamName: string;
  courseTitles: string[];
  appOrigin: string;
  temporaryPassword?: string;
}): Promise<SendEmailResult> {
  const base = params.appOrigin.replace(/\/$/, '');
  const loginUrl = `${base}/login`;
  const name = params.memberName.trim() || params.to.split('@')[0];
  const subjectCourse =
    params.courseTitles.length === 1
      ? params.courseTitles[0]!
      : params.courseTitles.length > 1
        ? `${params.courseTitles.length} CARSI courses`
        : 'your CARSI courses';

  const { html, text } = renderTeamMemberAddedEmail({
    appOrigin: base,
    memberName: name,
    inviterName: params.inviterName,
    teamName: params.teamName,
    courseTitles: params.courseTitles,
    loginUrl,
    memberEmail: params.to,
    temporaryPassword: params.temporaryPassword,
  });

  return sendEmail({
    to: params.to,
    subject: `${params.inviterName} gave you access to ${subjectCourse}`,
    html,
    text,
  });
}

export async function sendYearlyMembershipEmail(params: {
  to: string;
  memberName: string;
  memberEmail: string;
  temporaryPassword: string;
  priceLabel: string;
  courseCount: number;
  durationLabel: string;
  appOrigin: string;
}): Promise<SendEmailResult> {
  const base = params.appOrigin.replace(/\/$/, '');
  const loginUrl = `${base}/login`;
  const dashboardUrl = `${base}/dashboard/student`;
  const name = params.memberName.trim() || params.to.split('@')[0];

  const { html, text } = renderYearlyMembershipEmail({
    appOrigin: base,
    memberName: name,
    memberEmail: params.memberEmail,
    temporaryPassword: params.temporaryPassword,
    priceLabel: params.priceLabel,
    courseCount: params.courseCount,
    durationLabel: params.durationLabel,
    loginUrl,
    dashboardUrl,
  });

  return sendEmail({
    to: params.to,
    subject: 'Your CARSI Yearly Membership — sign-in details',
    html,
    text,
  });
}

export async function sendAdminPasswordResetEmail(params: {
  to: string;
  memberName: string | null;
  memberEmail: string;
  temporaryPassword: string;
  appOrigin: string;
}): Promise<SendEmailResult> {
  const base = params.appOrigin.replace(/\/$/, '');
  const loginUrl = `${base}/login`;
  const name = params.memberName?.trim() || params.to.split('@')[0] || 'Learner';

  const { html, text } = renderAdminPasswordResetEmail({
    appOrigin: base,
    memberName: name,
    memberEmail: params.memberEmail,
    temporaryPassword: params.temporaryPassword,
    loginUrl,
  });

  return sendEmail({
    to: params.to,
    subject: 'Your CARSI Learning password was reset',
    html,
    text,
  });
}

export async function sendCcwRoadshowBookingConfirmationEmail(params: {
  to: string;
  attendeeName: string;
  eventCity: string;
  eventDates: string;
  dateRangeLabel: string;
  timeLabel: string;
  venueName: string;
  venueAddress: string;
  ticketLabel: string;
  seatCount: number;
  amountLabel: string;
  businessName?: string;
  phone?: string;
  appOrigin: string;
}): Promise<SendEmailResult> {
  const base = params.appOrigin.replace(/\/$/, '');
  const eventPageUrl = `${base}/events/ccw-roadshow`;

  const { html, text } = renderCcwRoadshowBookingConfirmationEmail({
    appOrigin: base,
    attendeeName: params.attendeeName,
    eventCity: params.eventCity,
    eventDates: params.eventDates,
    dateRangeLabel: params.dateRangeLabel,
    timeLabel: params.timeLabel,
    venueName: params.venueName,
    venueAddress: params.venueAddress,
    ticketLabel: params.ticketLabel,
    seatCount: params.seatCount,
    amountLabel: params.amountLabel,
    businessName: params.businessName,
    phone: params.phone,
    eventPageUrl,
  });

  try {
    const result = await sendEmail({
      to: params.to,
      subject: `Booking confirmed — CARSI x CCW ${params.eventCity}`,
      html,
      text,
    });

    if (!result.sent) {
      console.error('[ccw-roadshow-email] confirmation email not sent', {
        to: params.to,
        eventCity: params.eventCity,
        reason: result.reason,
        messageId: result.messageId,
      });
    }

    return result;
  } catch (error) {
    console.error('[ccw-roadshow-email] confirmation email error', {
      to: params.to,
      eventCity: params.eventCity,
      error:
        error instanceof Error
          ? { message: error.message, name: error.name, stack: error.stack }
          : error,
    });
    throw error;
  }
}

/**
 * Free roadshow registration email (confirmed / waitlisted / promoted).
 * Carries the free-entry token; the template never tells a waitlisted attendee
 * to show a token at check-in.
 */
export async function sendCcwRoadshowRegistrationEmail(params: {
  to: string;
  kind: RoadshowEmailKind;
  attendeeName: string;
  eventCity: string;
  dateRangeLabel: string;
  timeLabel: string;
  venueName: string;
  venueAddress: string;
  seatCount: number;
  freeEntryToken: string;
  appOrigin: string;
}): Promise<SendEmailResult> {
  const base = params.appOrigin.replace(/\/$/, '');
  const { subject, html, text } = buildRegistrationEmail({
    kind: params.kind,
    attendeeName: params.attendeeName,
    eventCity: params.eventCity,
    dateRangeLabel: params.dateRangeLabel,
    timeLabel: params.timeLabel,
    venueName: params.venueName,
    venueAddress: params.venueAddress,
    seatCount: params.seatCount,
    freeEntryToken: params.freeEntryToken,
    eventPageUrl: `${base}/events/ccw-roadshow`,
  });

  return sendEmail({ to: params.to, subject, html, text });
}

/**
 * Internal notification to the campaign owner(s) when someone registers for a
 * roadshow city event (Melbourne → Phill; Sydney → Toby + Phill). Recipients are
 * resolved server-side via getRoadshowNotifyRecipients. No-op caller-side when the
 * recipient list is empty. Rides the same Mailtrap transport as attendee email.
 */
export async function sendCcwRoadshowOrganizerNotificationEmail(params: {
  to: string[];
  eventCity: string;
  dateRangeLabel: string;
  registrationStatus: string;
  seatCount: number;
  freeEntryToken: string;
  companyName?: string;
  contactEmail: string;
  contactPhone?: string;
  attendees: { fullName: string; yearsExperience: string; goals: string }[];
  appOrigin: string;
}): Promise<SendEmailResult> {
  if (params.to.length === 0) {
    return { sent: false, reason: 'not_configured' };
  }

  const base = params.appOrigin.replace(/\/$/, '');
  const adminUrl = `${base}/admin/ccw-roadshow`;
  const statusLabel = params.registrationStatus === 'confirmed' ? 'Confirmed' : 'Waitlisted';
  const esc = (v: string) =>
    v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const attendeeLinesText = params.attendees
    .map((a, i) => `  ${i + 1}. ${a.fullName} (${a.yearsExperience} yrs) — ${a.goals}`)
    .join('\n');
  const attendeeLinesHtml = params.attendees
    .map(
      (a) =>
        `<li><strong>${esc(a.fullName)}</strong> (${esc(a.yearsExperience)} yrs) — ${esc(a.goals)}</li>`,
    )
    .join('');

  const text = [
    `New CARSI x CCW ${params.eventCity} registration — ${statusLabel}`,
    '',
    `Event: ${params.eventCity} (${params.dateRangeLabel})`,
    `Status: ${statusLabel}`,
    `Seats: ${params.seatCount}`,
    `Free-entry token: ${params.freeEntryToken}`,
    `Business: ${params.companyName || '—'}`,
    `Contact: ${params.contactEmail}${params.contactPhone ? ` / ${params.contactPhone}` : ''}`,
    '',
    'Attendees:',
    attendeeLinesText || '  (none)',
    '',
    `Manage: ${adminUrl}`,
  ].join('\n');

  const html = `
    <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;font-size:14px;color:#0f172a;">
      <h2 style="margin:0 0 12px;">New CARSI x CCW ${esc(params.eventCity)} registration — ${statusLabel}</h2>
      <p style="margin:0 0 4px;"><strong>Event:</strong> ${esc(params.eventCity)} (${esc(params.dateRangeLabel)})</p>
      <p style="margin:0 0 4px;"><strong>Status:</strong> ${statusLabel}</p>
      <p style="margin:0 0 4px;"><strong>Seats:</strong> ${params.seatCount}</p>
      <p style="margin:0 0 4px;"><strong>Free-entry token:</strong> ${esc(params.freeEntryToken)}</p>
      <p style="margin:0 0 4px;"><strong>Business:</strong> ${esc(params.companyName || '—')}</p>
      <p style="margin:0 0 12px;"><strong>Contact:</strong> ${esc(params.contactEmail)}${params.contactPhone ? ` / ${esc(params.contactPhone)}` : ''}</p>
      <p style="margin:0 0 4px;"><strong>Attendees:</strong></p>
      <ul style="margin:0 0 12px;padding-left:18px;">${attendeeLinesHtml || '<li>(none)</li>'}</ul>
      <p style="margin:0;"><a href="${adminUrl}">Manage roadshow registrations</a></p>
    </div>`;

  return sendEmail({
    to: params.to,
    replyTo: params.contactEmail,
    subject: `[CCW ${params.eventCity}] ${statusLabel} registration — ${params.companyName || params.contactEmail}`,
    html,
    text,
  });
}

export async function sendContactNotificationEmail(params: {
  appOrigin: string;
  ticketRef: string;
  firstName: string;
  lastName: string;
  email: string;
  message: string;
  notifyTo: string;
}): Promise<SendEmailResult> {
  const base = params.appOrigin.replace(/\/$/, '');
  const { html, text } = renderContactNotificationEmail({
    appOrigin: base,
    ticketRef: params.ticketRef,
    firstName: params.firstName,
    lastName: params.lastName,
    email: params.email,
    message: params.message,
    adminContactsUrl: `${base}/admin/contacts`,
  });

  return sendEmail({
    to: params.notifyTo,
    replyTo: params.email,
    subject: `[CARSI Contact #${params.ticketRef}] ${params.firstName} ${params.lastName}`,
    html,
    text,
  });
}

/**
 * Send an IICRC-grounded reply to a contact enquiry (Phase 2). Used by both the
 * founder's inline reply from the Contacts section and the 2h SLA auto-dispatch.
 * `replyBody` is the exact composed, cited, disclaimered text — never mutated here.
 */
export async function sendContactReplyEmail(params: {
  appOrigin: string;
  to: string;
  replyBody: string;
  ticketRef?: string;
  replyTo?: string;
}): Promise<SendEmailResult> {
  const base = params.appOrigin.replace(/\/$/, '');
  const ref = params.ticketRef?.trim();
  const { html, text } = renderContactReplyEmail({
    appOrigin: base,
    replyBody: params.replyBody,
    ticketRef: ref,
  });

  return sendEmail({
    to: params.to,
    replyTo:
      params.replyTo?.trim() ||
      process.env.CONTACT_NOTIFY_EMAIL?.trim() ||
      process.env.ADMIN_EMAIL?.trim() ||
      'support@carsi.com.au',
    subject: ref ? `Re: your enquiry to CARSI [#${ref}]` : 'Re: your enquiry to CARSI',
    html,
    text,
  });
}

/** Resolve app origin when only a request or explicit origin string is available. */
export function resolveAppOrigin(
  originOrRequest?: { nextUrl?: { origin: string } } | string | null
): string {
  if (typeof originOrRequest === 'string' && originOrRequest.trim()) {
    return originOrRequest.replace(/\/$/, '');
  }
  if (originOrRequest && typeof originOrRequest === 'object' && 'nextUrl' in originOrRequest) {
    return getAppOrigin(originOrRequest as Parameters<typeof getAppOrigin>[0]);
  }
  return getAppOrigin();
}
