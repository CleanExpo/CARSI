import { NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { ensureReplyDisclaimer } from '@/lib/server/contact-reply';
import { ticketRefFromId } from '@/lib/server/contact-reply-dispatch';
import { getAppOrigin } from '@/lib/server/app-url';
import { sendContactReplyEmail } from '@/lib/server/transactional-email';
import { prisma } from '@/lib/prisma';

/**
 * POST — the founder's inline reply from the Contacts section. Sends the founder's
 * free-text reply immediately (with the disclaimer footer guaranteed), records the
 * send as an audit row, and marks the submission replied. Human-authored + human-sent,
 * so no draft-approval gate is needed.
 *
 * Body: { submissionId, replyBody }
 */
export async function POST(request: NextRequest) {
  const session = await getAdminSessionOrNull();
  if (!session) return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as { submissionId?: string; replyBody?: string };
  const submissionId = body.submissionId?.trim();
  const rawReply = body.replyBody?.trim();
  if (!submissionId || !rawReply) {
    return NextResponse.json({ detail: 'submissionId and replyBody required' }, { status: 400 });
  }

  const submission = await prisma.contactSubmission.findUnique({ where: { id: submissionId } });
  if (!submission) return NextResponse.json({ detail: 'Submission not found' }, { status: 404 });

  const replyBody = ensureReplyDisclaimer(rawReply);
  const ticketRef = ticketRefFromId(submissionId);

  const result = await sendContactReplyEmail({
    appOrigin: getAppOrigin(request),
    to: submission.email,
    replyBody,
    ticketRef,
  });
  if (!result.sent) {
    return NextResponse.json({ detail: `Send failed: ${result.reason}` }, { status: 502 });
  }

  const now = new Date();
  try {
    await prisma.contactReplyDraft.create({
      data: {
        submissionId,
        recipientEmail: submission.email,
        recipientName: `${submission.firstName} ${submission.lastName}`.trim() || 'there',
        question: submission.message,
        replyBody,
        standardsCited: [],
        stormSources: [],
        ngramCheck: 'pass',
        autoSendEligible: false,
        draftedBy: `admin:${session.email}`,
        approvedBy: session.email,
        sentVia: 'human',
        status: 'sent',
        sentAt: now,
      },
    });
    await prisma.contactSubmission.update({ where: { id: submissionId }, data: { status: 'replied' } });
  } catch (error) {
    // Email already went out; log the audit-write failure but report success.
    console.error('[admin/contacts/reply] audit write failed after send:', error);
  }

  return NextResponse.json({ ok: true });
}
