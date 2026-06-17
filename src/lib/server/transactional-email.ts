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
  renderEnrollmentWelcomeEmail,
  renderPasswordResetEmail,
  renderRegistrationWelcomeEmail,
  renderTeamMemberAddedEmail,
  renderYearlyMembershipEmail,
} from '@/lib/server/email-templates';
import { getFirstLessonLearnPath } from '@/lib/server/first-lesson';

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
