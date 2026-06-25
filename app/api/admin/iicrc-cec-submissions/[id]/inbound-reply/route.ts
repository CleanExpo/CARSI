import { type NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import {
  getRenewalSubmissionDetail,
  logInboundRenewalReply,
} from '@/lib/server/iicrc-renewal-communication';
import { isRenewalStatus, type RenewalStatus } from '@/types/iicrc-renewal';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const submissionId = id.trim();
  if (!submissionId) {
    return NextResponse.json({ detail: 'Invalid submission id' }, { status: 400 });
  }

  let body: {
    fromEmail?: string;
    subject?: string;
    textBody?: string;
    htmlBody?: string;
    receivedAt?: string;
    setRenewalStatus?: string;
    attachments?: { filename: string; mimeType: string; sizeBytes?: number }[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON' }, { status: 400 });
  }

  const fromEmail = typeof body.fromEmail === 'string' ? body.fromEmail.trim() : '';
  const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
  const textBody = typeof body.textBody === 'string' ? body.textBody.trim() : '';
  if (!fromEmail || !subject || !textBody) {
    return NextResponse.json(
      { detail: 'fromEmail, subject, and textBody are required' },
      { status: 400 },
    );
  }

  const existing = await getRenewalSubmissionDetail(submissionId);
  if (!existing) {
    return NextResponse.json({ detail: 'Submission not found' }, { status: 404 });
  }

  let receivedAt: Date | undefined;
  if (typeof body.receivedAt === 'string' && body.receivedAt.trim()) {
    const parsed = new Date(body.receivedAt);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ detail: 'Invalid receivedAt' }, { status: 400 });
    }
    receivedAt = parsed;
  }

  let setRenewalStatus: RenewalStatus = 'awaiting_response';
  if (typeof body.setRenewalStatus === 'string' && body.setRenewalStatus.trim()) {
    const raw = body.setRenewalStatus.trim();
    if (!isRenewalStatus(raw)) {
      return NextResponse.json({ detail: 'Invalid setRenewalStatus' }, { status: 400 });
    }
    setRenewalStatus = raw;
  }

  const attachments = Array.isArray(body.attachments)
    ? body.attachments
        .filter(
          (a): a is { filename: string; mimeType: string; sizeBytes?: number } =>
            typeof a?.filename === 'string' &&
            a.filename.trim().length > 0 &&
            typeof a?.mimeType === 'string' &&
            a.mimeType.trim().length > 0,
        )
        .map((a) => ({
          filename: a.filename.trim(),
          mimeType: a.mimeType.trim(),
          sizeBytes: typeof a.sizeBytes === 'number' ? a.sizeBytes : null,
          direction: 'inbound' as const,
        }))
    : undefined;

  await logInboundRenewalReply({
    submissionId,
    authorAdminEmail: session.email,
    fromEmail,
    subject,
    textBody,
    htmlBody: typeof body.htmlBody === 'string' ? body.htmlBody : null,
    receivedAt,
    attachments,
    setRenewalStatus,
  });

  const updated = await getRenewalSubmissionDetail(submissionId);
  return NextResponse.json({ ok: true, submission: updated });
}
