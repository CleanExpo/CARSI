import { randomUUID } from 'node:crypto';

import { prisma } from '@/lib/prisma';
import {
  buildCompletionCertificatePdf,
  completionCertificateDataFromEnrollment,
} from '@/lib/server/certificate-pdf';
import { sendEmail } from '@/lib/server/email';
import {
  courseEligibleForIicrcCecSubmission,
  getIicrcCecSubmissionEmail,
  isIicrcCecAutoSubmitEnabled,
} from '@/lib/server/iicrc-cec-config';
import {
  buildIicrcCecSubmissionHtml,
  buildIicrcCecSubmissionSubject,
  buildIicrcCecSubmissionText,
  buildTechnicianCecReceiptHtml,
  buildTechnicianCecReceiptText,
  type IicrcCecSubmissionEmailContent,
} from '@/lib/server/iicrc-cec-email';

import { logRenewalCommunication } from '@/lib/server/iicrc-renewal-communication';

export type IicrcCecSubmissionStatus = 'pending' | 'sent' | 'failed' | 'skipped';

export type ProcessIicrcCecSubmissionOptions = {
  initiatedByAdminEmail?: string | null;
};

function emailFromAddress(): string {
  return (
    process.env.EMAIL_FROM?.trim() || 'CARSI Learning <noreply@carsi.com.au>'
  );
}

export type IicrcCecSubmissionRow = {
  id: string;
  enrollment_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  course_title: string;
  course_slug: string;
  status: IicrcCecSubmissionStatus;
  renewal_status: string;
  initiated_by_admin_email: string | null;
  communication_count: number;
  cec_hours: number | null;
  iicrc_discipline: string | null;
  iicrc_member_number: string | null;
  recipient_email: string;
  sent_at: string | null;
  failure_reason: string | null;
  provider_message_id: string | null;
  created_at: string;
};

function formatAuDate(d: Date): string {
  return d.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function appOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_FRONTEND_URL?.trim() ||
    'https://carsi.com.au'
  ).replace(/\/$/, '');
}

async function loadEnrollmentForSubmission(enrollmentId: string) {
  return prisma.lmsEnrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      student: {
        select: {
          id: true,
          email: true,
          fullName: true,
          iicrcMemberNumber: true,
        },
      },
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
          iicrcDiscipline: true,
          cecHours: true,
          level: true,
        },
      },
    },
  });
}

function emailContentFromEnrollment(
  row: NonNullable<Awaited<ReturnType<typeof loadEnrollmentForSubmission>>>,
  completedAt: Date,
): IicrcCecSubmissionEmailContent {
  const origin = appOrigin();
  const studentName = row.student.fullName?.trim() || row.student.email;
  const cecHours = Number(row.course.cecHours ?? 0);
  return {
    studentName,
    studentEmail: row.student.email,
    iicrcMemberNumber: row.student.iicrcMemberNumber,
    courseTitle: row.course.title,
    iicrcDiscipline: row.course.iicrcDiscipline?.trim() || '—',
    cecHours: Number.isFinite(cecHours) ? cecHours : 0,
    completedDate: formatAuDate(completedAt),
    credentialId: row.id,
    verificationUrl: `${origin}/verify/credential/${row.id}`,
  };
}

/**
 * Queue IICRC CEC submission after course completion. Idempotent per enrollment.
 * Safe to call fire-and-forget from enrollment sync.
 */
export async function processIicrcCecSubmissionForEnrollment(
  enrollmentId: string,
  options?: ProcessIicrcCecSubmissionOptions,
): Promise<{ status: IicrcCecSubmissionStatus; submissionId?: string }> {
  const initiatedByAdminEmail = options?.initiatedByAdminEmail?.trim() || null;
  if (!process.env.DATABASE_URL?.trim()) {
    return { status: 'skipped' };
  }

  const existing = await prisma.lmsIicrcCecSubmission.findUnique({
    where: { enrollmentId },
    select: { id: true, status: true },
  });
  if (existing?.status === 'sent') {
    return { status: 'sent', submissionId: existing.id };
  }

  const enrollment = await loadEnrollmentForSubmission(enrollmentId);
  if (!enrollment || enrollment.status !== 'completed' || !enrollment.completedAt) {
    return { status: 'skipped' };
  }

  if (!courseEligibleForIicrcCecSubmission(enrollment.course)) {
    if (!existing) {
      await prisma.lmsIicrcCecSubmission.create({
        data: {
          id: randomUUID(),
          enrollmentId: enrollment.id,
          studentId: enrollment.studentId,
          courseId: enrollment.courseId,
          recipientEmail: getIicrcCecSubmissionEmail(),
          technicianEmail: enrollment.student.email,
          status: 'skipped',
          renewalStatus: 'skipped',
          initiatedByAdminEmail,
          failureReason: 'course_not_cec_eligible',
          cecHours: enrollment.course.cecHours,
          iicrcDiscipline: enrollment.course.iicrcDiscipline,
          iicrcMemberNumber: enrollment.student.iicrcMemberNumber,
        },
      });
    }
    return { status: 'skipped' };
  }

  if (!isIicrcCecAutoSubmitEnabled()) {
    const submission = existing
      ? await prisma.lmsIicrcCecSubmission.update({
          where: { id: existing.id },
          data: {
            status: 'skipped',
            renewalStatus: 'skipped',
            initiatedByAdminEmail: initiatedByAdminEmail ?? undefined,
            failureReason: 'auto_submit_disabled',
          },
        })
      : await prisma.lmsIicrcCecSubmission.create({
          data: {
            id: randomUUID(),
            enrollmentId: enrollment.id,
            studentId: enrollment.studentId,
            courseId: enrollment.courseId,
            recipientEmail: getIicrcCecSubmissionEmail(),
            technicianEmail: enrollment.student.email,
            status: 'skipped',
            renewalStatus: 'skipped',
            initiatedByAdminEmail,
            failureReason: 'auto_submit_disabled',
            cecHours: enrollment.course.cecHours,
            iicrcDiscipline: enrollment.course.iicrcDiscipline,
            iicrcMemberNumber: enrollment.student.iicrcMemberNumber,
          },
        });

    await logRenewalCommunication({
      submissionId: submission.id,
      enrollmentId: enrollment.id,
      studentId: enrollment.studentId,
      courseId: enrollment.courseId,
      direction: 'outbound',
      kind: 'iicrc_submission',
      initiatedByAdminEmail,
      fromEmail: emailFromAddress(),
      toEmails: submission.recipientEmail,
      subject: 'CEC submission skipped — auto-submit disabled',
      textBody: 'Automatic IICRC renewal email was not sent because auto-submit is disabled.',
      deliveryStatus: 'skipped',
      failureReason: 'auto_submit_disabled',
    });

    return { status: 'skipped', submissionId: submission.id };
  }

  const recipient = getIicrcCecSubmissionEmail();
  const content = emailContentFromEnrollment(enrollment, enrollment.completedAt);
  const subject = buildIicrcCecSubmissionSubject(content);
  const textBody = buildIicrcCecSubmissionText(content);
  const htmlBody = buildIicrcCecSubmissionHtml(content);
  const ccList = [enrollment.student.email];

  const submission =
    existing != null
      ? await prisma.lmsIicrcCecSubmission.update({
          where: { id: existing.id },
          data: {
            status: 'pending',
            renewalStatus: 'pending',
            recipientEmail: recipient,
            technicianEmail: enrollment.student.email,
            initiatedByAdminEmail,
            cecHours: enrollment.course.cecHours,
            iicrcDiscipline: enrollment.course.iicrcDiscipline,
            iicrcMemberNumber: enrollment.student.iicrcMemberNumber,
            emailSubject: subject,
            emailTextBody: textBody,
            emailHtmlBody: htmlBody,
            ccEmails: JSON.stringify(ccList),
            failureReason: null,
            sentAt: null,
            providerMessageId: null,
          },
        })
      : await prisma.lmsIicrcCecSubmission.create({
          data: {
            id: randomUUID(),
            enrollmentId: enrollment.id,
            studentId: enrollment.studentId,
            courseId: enrollment.courseId,
            recipientEmail: recipient,
            technicianEmail: enrollment.student.email,
            status: 'pending',
            renewalStatus: 'pending',
            initiatedByAdminEmail,
            cecHours: enrollment.course.cecHours,
            iicrcDiscipline: enrollment.course.iicrcDiscipline,
            iicrcMemberNumber: enrollment.student.iicrcMemberNumber,
            emailSubject: subject,
            emailTextBody: textBody,
            emailHtmlBody: htmlBody,
            ccEmails: JSON.stringify(ccList),
          },
        });

  const pdfFilename = `carsi-certificate-${enrollment.course.slug}.pdf`;

  try {
    const pdf = await buildCompletionCertificatePdf(
      completionCertificateDataFromEnrollment(
        {
          id: enrollment.id,
          completedAt: enrollment.completedAt,
          certificateIssuedAt: enrollment.certificateIssuedAt,
          student: {
            email: enrollment.student.email,
            fullName: enrollment.student.fullName,
          },
          course: {
            title: enrollment.course.title,
            iicrcDiscipline: enrollment.course.iicrcDiscipline,
            cecHours: enrollment.course.cecHours,
            level: enrollment.course.level,
          },
        },
        appOrigin(),
      ),
    );

    await prisma.lmsEnrollment.update({
      where: { id: enrollment.id },
      data: { certificateIssuedAt: new Date() },
    });

    const sentAt = new Date();
    const iicrcResult = await sendEmail({
      to: recipient,
      cc: enrollment.student.email,
      subject,
      html: htmlBody,
      text: textBody,
      replyTo: enrollment.student.email,
      attachments: [{ filename: pdfFilename, content: pdf }],
    });

    if (!iicrcResult.sent) {
      const failureReason = iicrcResult.reason ?? 'send_failed';
      await prisma.lmsIicrcCecSubmission.update({
        where: { id: submission.id },
        data: {
          status: 'failed',
          renewalStatus: 'failed',
          failureReason,
        },
      });

      await logRenewalCommunication({
        submissionId: submission.id,
        enrollmentId: enrollment.id,
        studentId: enrollment.studentId,
        courseId: enrollment.courseId,
        direction: 'outbound',
        kind: 'iicrc_submission',
        initiatedByAdminEmail,
        fromEmail: emailFromAddress(),
        toEmails: recipient,
        ccEmails: ccList,
        subject,
        textBody,
        htmlBody,
        deliveryStatus: 'failed',
        failureReason,
        attachments: [
          {
            filename: pdfFilename,
            mimeType: 'application/pdf',
            sizeBytes: pdf.length,
            direction: 'outbound',
          },
        ],
      });

      return { status: 'failed', submissionId: submission.id };
    }

    await prisma.lmsIicrcCecSubmission.update({
      where: { id: submission.id },
      data: {
        status: 'sent',
        renewalStatus: 'sent',
        sentAt,
        providerMessageId: iicrcResult.messageId ?? null,
        failureReason: null,
      },
    });

    await logRenewalCommunication({
      submissionId: submission.id,
      enrollmentId: enrollment.id,
      studentId: enrollment.studentId,
      courseId: enrollment.courseId,
      direction: 'outbound',
      kind: 'iicrc_submission',
      initiatedByAdminEmail,
      fromEmail: emailFromAddress(),
      toEmails: recipient,
      ccEmails: ccList,
      subject,
      textBody,
      htmlBody,
      deliveryStatus: 'sent',
      providerMessageId: iicrcResult.messageId ?? null,
      sentAt,
      attachments: [
        {
          filename: pdfFilename,
          mimeType: 'application/pdf',
          sizeBytes: pdf.length,
          direction: 'outbound',
        },
      ],
    });

    const receiptSubject = `CEC submitted to IICRC — ${enrollment.course.title}`;
    const receiptText = buildTechnicianCecReceiptText(content);
    const receiptHtml = buildTechnicianCecReceiptHtml(content);

    void sendEmail({
      to: enrollment.student.email,
      subject: receiptSubject,
      html: receiptHtml,
      text: receiptText,
    })
      .then(async (receiptResult) => {
        await logRenewalCommunication({
          submissionId: submission.id,
          enrollmentId: enrollment.id,
          studentId: enrollment.studentId,
          courseId: enrollment.courseId,
          direction: 'outbound',
          kind: 'technician_receipt',
          initiatedByAdminEmail,
          fromEmail: emailFromAddress(),
          toEmails: enrollment.student.email,
          subject: receiptSubject,
          textBody: receiptText,
          htmlBody: receiptHtml,
          deliveryStatus: receiptResult.sent ? 'sent' : 'failed',
          providerMessageId: receiptResult.messageId ?? null,
          failureReason: receiptResult.sent ? null : (receiptResult.reason ?? 'send_failed'),
          sentAt: receiptResult.sent ? new Date() : null,
        });
      })
      .catch((e) => console.error('[iicrc-cec] technician receipt', e));

    return { status: 'sent', submissionId: submission.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[iicrc-cec] submission failed', enrollmentId, e);
    await prisma.lmsIicrcCecSubmission.update({
      where: { id: submission.id },
      data: { status: 'failed', renewalStatus: 'failed', failureReason: msg.slice(0, 500) },
    });

    await logRenewalCommunication({
      submissionId: submission.id,
      enrollmentId: enrollment.id,
      studentId: enrollment.studentId,
      courseId: enrollment.courseId,
      direction: 'outbound',
      kind: 'iicrc_submission',
      initiatedByAdminEmail,
      fromEmail: emailFromAddress(),
      toEmails: recipient,
      ccEmails: ccList,
      subject,
      textBody,
      htmlBody,
      deliveryStatus: 'failed',
      failureReason: msg.slice(0, 500),
    }).catch((logErr) => console.error('[iicrc-cec] audit log failed', logErr));

    return { status: 'failed', submissionId: submission.id };
  }
}

export async function retryIicrcCecSubmission(
  submissionId: string,
  options?: ProcessIicrcCecSubmissionOptions,
): Promise<{
  status: IicrcCecSubmissionStatus;
}> {
  const row = await prisma.lmsIicrcCecSubmission.findUnique({
    where: { id: submissionId },
    select: { enrollmentId: true, status: true, initiatedByAdminEmail: true },
  });
  if (!row) throw new Error('SUBMISSION_NOT_FOUND');
  if (row.status === 'sent') return { status: 'sent' };

  await prisma.lmsIicrcCecSubmission.update({
    where: { id: submissionId },
    data: { status: 'pending', failureReason: null, sentAt: null, providerMessageId: null },
  });

  const result = await processIicrcCecSubmissionForEnrollment(row.enrollmentId, {
    initiatedByAdminEmail: options?.initiatedByAdminEmail ?? row.initiatedByAdminEmail,
  });
  return { status: result.status };
}

export async function getCecSubmissionSummaryForEnrollment(
  enrollmentId: string,
): Promise<{
  status: IicrcCecSubmissionStatus | null;
  sent_at: string | null;
  recipient_email: string | null;
} | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;
  const row = await prisma.lmsIicrcCecSubmission.findUnique({
    where: { enrollmentId },
    select: { status: true, sentAt: true, recipientEmail: true },
  });
  if (!row) return null;
  return {
    status: row.status as IicrcCecSubmissionStatus,
    sent_at: row.sentAt?.toISOString() ?? null,
    recipient_email: row.recipientEmail,
  };
}

export async function listIicrcCecSubmissionsForAdmin(options?: {
  limit?: number;
}): Promise<IicrcCecSubmissionRow[]> {
  const limit = Math.min(Math.max(options?.limit ?? 100, 1), 500);
  const rows = await prisma.lmsIicrcCecSubmission.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      student: { select: { email: true, fullName: true } },
      course: { select: { title: true, slug: true } },
    },
  });

  const submissionIds = rows.map((r) => r.id);
  const countBySubmission = new Map<string, number>();
  if (submissionIds.length > 0) {
    const countRows = await prisma.lmsIicrcCecCommunication.groupBy({
      by: ['submissionId'],
      where: { submissionId: { in: submissionIds } },
      _count: { _all: true },
    });
    for (const c of countRows) {
      countBySubmission.set(c.submissionId, c._count._all);
    }
  }

  return rows.map((r) => ({
    id: r.id,
    enrollment_id: r.enrollmentId,
    student_id: r.studentId,
    student_name: r.student.fullName?.trim() || r.student.email,
    student_email: r.student.email,
    course_title: r.course.title,
    course_slug: r.course.slug,
    status: r.status as IicrcCecSubmissionStatus,
    renewal_status: r.renewalStatus,
    initiated_by_admin_email: r.initiatedByAdminEmail,
    communication_count: countBySubmission.get(r.id) ?? 0,
    cec_hours: r.cecHours,
    iicrc_discipline: r.iicrcDiscipline,
    iicrc_member_number: r.iicrcMemberNumber,
    recipient_email: r.recipientEmail,
    sent_at: r.sentAt?.toISOString() ?? null,
    failure_reason: r.failureReason,
    provider_message_id: r.providerMessageId,
    created_at: r.createdAt.toISOString(),
  }));
}

export async function getCecSubmissionsByEnrollmentIds(
  enrollmentIds: string[],
): Promise<Map<string, { status: string; sent_at: string | null }>> {
  const out = new Map<string, { status: string; sent_at: string | null }>();
  if (enrollmentIds.length === 0) return out;

  const rows = await prisma.lmsIicrcCecSubmission.findMany({
    where: { enrollmentId: { in: enrollmentIds } },
    select: { enrollmentId: true, status: true, sentAt: true },
  });
  for (const r of rows) {
    out.set(r.enrollmentId, {
      status: r.status,
      sent_at: r.sentAt?.toISOString() ?? null,
    });
  }
  return out;
}
