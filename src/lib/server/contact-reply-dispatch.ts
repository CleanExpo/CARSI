/**
 * Server-only orchestration for sending a contact reply and recording the send.
 *
 * Shared by all three send paths so the audit trail and the "mark thread replied"
 * side-effect are written identically:
 *  - the founder's inline reply from the Contacts section (sentVia 'human'),
 *  - approving an AI draft in the admin surface (sentVia 'human'),
 *  - the 2-hour SLA auto-dispatch (sentVia 'auto').
 *
 * Fails closed: only a `pending_approval` draft can be sent, and the row is not
 * marked sent unless the email actually went out.
 */

import { prisma } from '@/lib/prisma';
import { ensureReplyDisclaimer } from '@/lib/server/contact-reply';
import { sendContactReplyEmail } from '@/lib/server/transactional-email';

/** Human-facing ticket reference derived from a submission id (matches /api/contact). */
export function ticketRefFromId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

export interface DispatchResult {
  ok: boolean;
  reason?: string;
}

export interface DispatchDraftInput {
  draftId: string;
  appOrigin: string;
  /** Human email, or 'auto:sla-2h' when the SLA fired. */
  approvedBy: string;
  sentVia: 'human' | 'auto';
  /** Optional human edit applied before send (admin approval surface). */
  replyBodyOverride?: string;
}

/**
 * Send a persisted draft and record the outcome. Returns `{ ok:false, reason }`
 * without mutating the row when the draft is missing, already handled, or the
 * email fails — so callers (including the SLA cron) can safely retry.
 */
export async function dispatchContactReplyDraft(input: DispatchDraftInput): Promise<DispatchResult> {
  const draft = await prisma.contactReplyDraft.findUnique({ where: { id: input.draftId } });
  if (!draft) return { ok: false, reason: 'not_found' };
  if (draft.status !== 'pending_approval') return { ok: false, reason: 'not_pending' };

  const replyBody = ensureReplyDisclaimer(input.replyBodyOverride?.trim() || draft.replyBody);
  const ticketRef = draft.submissionId ? ticketRefFromId(draft.submissionId) : undefined;

  const result = await sendContactReplyEmail({
    appOrigin: input.appOrigin,
    to: draft.recipientEmail,
    replyBody,
    ticketRef,
  });
  if (!result.sent) return { ok: false, reason: result.reason ?? 'send_failed' };

  await prisma.contactReplyDraft.update({
    where: { id: draft.id },
    data: {
      replyBody,
      status: 'sent',
      approvedBy: input.approvedBy,
      sentVia: input.sentVia,
      sentAt: new Date(),
    },
  });

  if (draft.submissionId) {
    await prisma.contactSubmission
      .update({ where: { id: draft.submissionId }, data: { status: 'replied' } })
      .catch(() => {
        /* submission may have been removed; the draft send is still recorded */
      });
  }

  return { ok: true };
}
