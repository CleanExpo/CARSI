import { randomUUID } from 'node:crypto';

import { prisma } from '@/lib/prisma';
import type {
  CommunicationDirection,
  CommunicationKind,
  DeliveryStatus,
  RenewalCommunication,
  RenewalStatus,
  RenewalSubmissionDetail,
  RenewalSubmissionNote,
} from '@/types/iicrc-renewal';
import { isRenewalStatus } from '@/types/iicrc-renewal';

function parseEmailList(json: string | null | undefined): string[] {
  if (!json?.trim()) return [];
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e): e is string => typeof e === 'string' && e.trim().length > 0);
  } catch {
    return [];
  }
}

function serializeEmailList(emails: string | string[] | undefined | null): string {
  const list = Array.isArray(emails)
    ? emails
    : emails?.trim()
      ? [emails.trim()]
      : [];
  return JSON.stringify(list.filter(Boolean));
}

export type LogCommunicationParams = {
  submissionId: string;
  enrollmentId: string;
  studentId: string;
  courseId: string;
  direction: CommunicationDirection;
  kind: CommunicationKind;
  initiatedByAdminEmail?: string | null;
  fromEmail: string;
  toEmails: string | string[];
  ccEmails?: string | string[];
  subject: string;
  textBody?: string | null;
  htmlBody?: string | null;
  deliveryStatus: DeliveryStatus;
  providerMessageId?: string | null;
  failureReason?: string | null;
  sentAt?: Date | null;
  receivedAt?: Date | null;
  attachments?: {
    filename: string;
    mimeType: string;
    sizeBytes?: number | null;
    direction: CommunicationDirection;
  }[];
};

export async function logRenewalCommunication(
  params: LogCommunicationParams,
): Promise<string> {
  const id = randomUUID();
  await prisma.lmsIicrcCecCommunication.create({
    data: {
      id,
      submissionId: params.submissionId,
      enrollmentId: params.enrollmentId,
      studentId: params.studentId,
      courseId: params.courseId,
      direction: params.direction,
      kind: params.kind,
      initiatedByAdminEmail: params.initiatedByAdminEmail?.trim() || null,
      fromEmail: params.fromEmail,
      toEmails: serializeEmailList(params.toEmails),
      ccEmails: params.ccEmails ? serializeEmailList(params.ccEmails) : null,
      subject: params.subject,
      textBody: params.textBody ?? null,
      htmlBody: params.htmlBody ?? null,
      deliveryStatus: params.deliveryStatus,
      providerMessageId: params.providerMessageId ?? null,
      failureReason: params.failureReason ?? null,
      sentAt: params.sentAt ?? null,
      receivedAt: params.receivedAt ?? null,
      attachments: params.attachments?.length
        ? {
            create: params.attachments.map((a) => ({
              id: randomUUID(),
              filename: a.filename,
              mimeType: a.mimeType,
              sizeBytes: a.sizeBytes ?? null,
              direction: a.direction,
            })),
          }
        : undefined,
    },
  });
  return id;
}

export function deliveryStatusToRenewalStatus(
  deliveryStatus: string,
  current?: RenewalStatus,
): RenewalStatus {
  if (deliveryStatus === 'sent' || deliveryStatus === 'delivered') {
    if (current === 'approved' || current === 'rejected' || current === 'completed') {
      return current;
    }
    return 'sent';
  }
  if (deliveryStatus === 'failed' || deliveryStatus === 'bounced') return 'failed';
  if (deliveryStatus === 'skipped') return 'skipped';
  return current ?? 'pending';
}

function mapCommunication(row: {
  id: string;
  direction: string;
  kind: string;
  initiatedByAdminEmail: string | null;
  fromEmail: string;
  toEmails: string;
  ccEmails: string | null;
  subject: string;
  textBody: string | null;
  htmlBody: string | null;
  deliveryStatus: string;
  providerMessageId: string | null;
  failureReason: string | null;
  sentAt: Date | null;
  receivedAt: Date | null;
  createdAt: Date;
  attachments: {
    id: string;
    filename: string;
    mimeType: string;
    sizeBytes: number | null;
    direction: string;
  }[];
}): RenewalCommunication {
  return {
    id: row.id,
    direction: row.direction as CommunicationDirection,
    kind: row.kind as CommunicationKind,
    initiated_by_admin_email: row.initiatedByAdminEmail,
    from_email: row.fromEmail,
    to_emails: parseEmailList(row.toEmails),
    cc_emails: parseEmailList(row.ccEmails),
    subject: row.subject,
    text_body: row.textBody,
    html_body: row.htmlBody,
    delivery_status: row.deliveryStatus as DeliveryStatus,
    provider_message_id: row.providerMessageId,
    failure_reason: row.failureReason,
    sent_at: row.sentAt?.toISOString() ?? null,
    received_at: row.receivedAt?.toISOString() ?? null,
    created_at: row.createdAt.toISOString(),
    attachments: row.attachments.map((a) => ({
      id: a.id,
      filename: a.filename,
      mime_type: a.mimeType,
      size_bytes: a.sizeBytes,
      direction: a.direction as CommunicationDirection,
    })),
  };
}

function mapNote(row: {
  id: string;
  authorAdminEmail: string;
  body: string;
  followUpAction: string | null;
  followUpDueAt: Date | null;
  createdAt: Date;
}): RenewalSubmissionNote {
  return {
    id: row.id,
    author_admin_email: row.authorAdminEmail,
    body: row.body,
    follow_up_action: row.followUpAction,
    follow_up_due_at: row.followUpDueAt?.toISOString() ?? null,
    created_at: row.createdAt.toISOString(),
  };
}

export async function getRenewalSubmissionDetail(
  submissionId: string,
): Promise<RenewalSubmissionDetail | null> {
  const row = await prisma.lmsIicrcCecSubmission.findUnique({
    where: { id: submissionId },
    include: {
      student: { select: { email: true, fullName: true } },
      course: { select: { id: true, title: true, slug: true } },
      communications: {
        orderBy: { createdAt: 'asc' },
        include: { attachments: true },
      },
      notes: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!row) return null;

  return {
    id: row.id,
    enrollment_id: row.enrollmentId,
    student_id: row.studentId,
    student_name: row.student.fullName?.trim() || row.student.email,
    student_email: row.student.email,
    course_id: row.courseId,
    course_title: row.course.title,
    course_slug: row.course.slug,
    recipient_email: row.recipientEmail,
    technician_email: row.technicianEmail,
    status: row.status,
    renewal_status: row.renewalStatus as RenewalStatus,
    initiated_by_admin_email: row.initiatedByAdminEmail,
    cec_hours: row.cecHours,
    iicrc_discipline: row.iicrcDiscipline,
    iicrc_member_number: row.iicrcMemberNumber,
    email_subject: row.emailSubject,
    email_text_body: row.emailTextBody,
    email_html_body: row.emailHtmlBody,
    cc_emails: parseEmailList(row.ccEmails),
    sent_at: row.sentAt?.toISOString() ?? null,
    failure_reason: row.failureReason,
    provider_message_id: row.providerMessageId,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
    communications: row.communications.map(mapCommunication),
    notes: row.notes.map(mapNote),
  };
}

export async function listRenewalSubmissionsForStudent(
  studentId: string,
): Promise<RenewalSubmissionDetail[]> {
  const rows = await prisma.lmsIicrcCecSubmission.findMany({
    where: { studentId },
    orderBy: { createdAt: 'desc' },
    include: {
      student: { select: { email: true, fullName: true } },
      course: { select: { id: true, title: true, slug: true } },
      communications: {
        orderBy: { createdAt: 'asc' },
        include: { attachments: true },
      },
      notes: { orderBy: { createdAt: 'desc' } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    enrollment_id: row.enrollmentId,
    student_id: row.studentId,
    student_name: row.student.fullName?.trim() || row.student.email,
    student_email: row.student.email,
    course_id: row.courseId,
    course_title: row.course.title,
    course_slug: row.course.slug,
    recipient_email: row.recipientEmail,
    technician_email: row.technicianEmail,
    status: row.status,
    renewal_status: row.renewalStatus as RenewalStatus,
    initiated_by_admin_email: row.initiatedByAdminEmail,
    cec_hours: row.cecHours,
    iicrc_discipline: row.iicrcDiscipline,
    iicrc_member_number: row.iicrcMemberNumber,
    email_subject: row.emailSubject,
    email_text_body: row.emailTextBody,
    email_html_body: row.emailHtmlBody,
    cc_emails: parseEmailList(row.ccEmails),
    sent_at: row.sentAt?.toISOString() ?? null,
    failure_reason: row.failureReason,
    provider_message_id: row.providerMessageId,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
    communications: row.communications.map(mapCommunication),
    notes: row.notes.map(mapNote),
  }));
}

export async function updateRenewalSubmissionStatus(
  submissionId: string,
  renewalStatus: RenewalStatus,
): Promise<void> {
  await prisma.lmsIicrcCecSubmission.update({
    where: { id: submissionId },
    data: { renewalStatus },
  });
}

export async function addRenewalSubmissionNote(params: {
  submissionId: string;
  authorAdminEmail: string;
  body: string;
  followUpAction?: string | null;
  followUpDueAt?: Date | null;
}): Promise<RenewalSubmissionNote> {
  const row = await prisma.lmsIicrcCecSubmissionNote.create({
    data: {
      id: randomUUID(),
      submissionId: params.submissionId,
      authorAdminEmail: params.authorAdminEmail.trim(),
      body: params.body.trim(),
      followUpAction: params.followUpAction?.trim() || null,
      followUpDueAt: params.followUpDueAt ?? null,
    },
  });
  return mapNote(row);
}

export async function logInboundRenewalReply(params: {
  submissionId: string;
  authorAdminEmail: string;
  fromEmail: string;
  subject: string;
  textBody: string;
  htmlBody?: string | null;
  receivedAt?: Date;
  attachments?: LogCommunicationParams['attachments'];
  setRenewalStatus?: RenewalStatus;
}): Promise<void> {
  const submission = await prisma.lmsIicrcCecSubmission.findUnique({
    where: { id: params.submissionId },
    select: {
      id: true,
      enrollmentId: true,
      studentId: true,
      courseId: true,
      recipientEmail: true,
      technicianEmail: true,
    },
  });
  if (!submission) throw new Error('SUBMISSION_NOT_FOUND');

  await logRenewalCommunication({
    submissionId: submission.id,
    enrollmentId: submission.enrollmentId,
    studentId: submission.studentId,
    courseId: submission.courseId,
    direction: 'inbound',
    kind: 'inbound_reply',
    initiatedByAdminEmail: params.authorAdminEmail,
    fromEmail: params.fromEmail.trim(),
    toEmails: [submission.technicianEmail],
    subject: params.subject.trim(),
    textBody: params.textBody.trim(),
    htmlBody: params.htmlBody ?? null,
    deliveryStatus: 'delivered',
    receivedAt: params.receivedAt ?? new Date(),
    attachments: params.attachments,
  });

  const nextStatus = params.setRenewalStatus ?? 'awaiting_response';
  await prisma.lmsIicrcCecSubmission.update({
    where: { id: submission.id },
    data: { renewalStatus: nextStatus },
  });
}

export async function getRenewalSummaryByEnrollmentIds(
  enrollmentIds: string[],
): Promise<
  Map<
    string,
    {
      submission_id: string;
      status: string;
      renewal_status: RenewalStatus;
      sent_at: string | null;
      communication_count: number;
    }
  >
> {
  const out = new Map<
    string,
    {
      submission_id: string;
      status: string;
      renewal_status: RenewalStatus;
      sent_at: string | null;
      communication_count: number;
    }
  >();
  if (enrollmentIds.length === 0) return out;

  const rows = await prisma.lmsIicrcCecSubmission.findMany({
    where: { enrollmentId: { in: enrollmentIds } },
    select: {
      id: true,
      enrollmentId: true,
      status: true,
      renewalStatus: true,
      sentAt: true,
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

  for (const r of rows) {
    out.set(r.enrollmentId, {
      submission_id: r.id,
      status: r.status,
      renewal_status: isRenewalStatus(r.renewalStatus) ? r.renewalStatus : 'pending',
      sent_at: r.sentAt?.toISOString() ?? null,
      communication_count: countBySubmission.get(r.id) ?? 0,
    });
  }
  return out;
}
