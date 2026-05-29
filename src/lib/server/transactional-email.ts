/**
 * Single entry point for all CARSI transactional emails.
 * Uses branded templates from email-templates.ts and delivery from email.ts.
 */

import { getAppOrigin } from '@/lib/server/app-url';
import {
  renderContactNotificationEmail,
  renderEnrollmentWelcomeEmail,
  renderPasswordResetEmail,
  renderRegistrationWelcomeEmail,
  renderTeamMemberAddedEmail,
} from '@/lib/server/email-templates';
import { sendEmail, isEmailConfigured, type SendEmailResult } from '@/lib/server/email';
import { getFirstLessonLearnPath } from '@/lib/server/first-lesson';
import { prisma } from '@/lib/prisma';

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
  temporaryPassword: string;
}): Promise<SendEmailResult> {
  const base = params.appOrigin.replace(/\/$/, '');
  const loginUrl = `${base}/login`;
  const name = params.memberName.trim() || params.to.split('@')[0];
  const subjectCourse =
    params.courseTitles.length === 1
      ? params.courseTitles[0]!
      : `${params.courseTitles.length} CARSI courses`;

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
export function resolveAppOrigin(originOrRequest?: { nextUrl?: { origin: string } } | string | null): string {
  if (typeof originOrRequest === 'string' && originOrRequest.trim()) {
    return originOrRequest.replace(/\/$/, '');
  }
  if (originOrRequest && typeof originOrRequest === 'object' && 'nextUrl' in originOrRequest) {
    return getAppOrigin(originOrRequest as Parameters<typeof getAppOrigin>[0]);
  }
  return getAppOrigin();
}
