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
