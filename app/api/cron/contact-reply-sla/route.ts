import { NextResponse } from 'next/server';

import { isDueForAutoSend } from '@/lib/server/contact-reply';
import { dispatchContactReplyDraft } from '@/lib/server/contact-reply-dispatch';
import { getAppOrigin } from '@/lib/server/app-url';
import { prisma } from '@/lib/prisma';

/**
 * Contact-reply SLA auto-dispatch (Phase 2).
 *
 * Founder-authorized 2026-07-01: if no reply has gone out from the Contacts section
 * within 2 hours, auto-send the AI-drafted, cited, disclaimered answer. Only drafts
 * that cleared the deterministic gates (no-verbatim guard + judge PASS →
 * auto_send_eligible) are ever auto-sent; everything else stays for a human. The
 * per-draft `isDueForAutoSend` check is the final gate, so re-running is idempotent.
 *
 * Wire to a scheduler hitting this every ~10 min with `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ ok: true, dispatched: 0, reason: 'no_database' });
  }

  const now = new Date();
  const candidates = await prisma.contactReplyDraft.findMany({
    where: { status: 'pending_approval', autoSendEligible: true },
    include: { submission: true },
    orderBy: { createdAt: 'asc' },
    take: 100,
  });

  const due = candidates.filter((draft) =>
    isDueForAutoSend({
      status: draft.status,
      autoSendEligible: draft.autoSendEligible,
      submissionStatus: draft.submission?.status ?? 'new',
      submissionCreatedAt: draft.submission?.createdAt ?? draft.createdAt,
      now,
    }),
  );

  const appOrigin = getAppOrigin();
  let dispatched = 0;
  const failures: Array<{ id: string; reason?: string }> = [];

  for (const draft of due) {
    const result = await dispatchContactReplyDraft({
      draftId: draft.id,
      appOrigin,
      approvedBy: 'auto:sla-2h',
      sentVia: 'auto',
    });
    if (result.ok) dispatched += 1;
    else failures.push({ id: draft.id, reason: result.reason });
  }

  return NextResponse.json({
    ok: true,
    eligible: candidates.length,
    due: due.length,
    dispatched,
    failures,
    timestamp: now.toISOString(),
  });
}
