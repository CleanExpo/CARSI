import { NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { getAppOrigin } from '@/lib/server/app-url';
import {
  buildContactReplyText,
  buildReplyProvenance,
  citedStandards,
  validateReplyNoVerbatim,
  type JudgeVerdict,
  type ReplySource,
} from '@/lib/server/contact-reply';
import { dispatchContactReplyDraft } from '@/lib/server/contact-reply-dispatch';
import { prisma } from '@/lib/prisma';

/** Does this request carry the privileged automation secret (the drafting agent)? */
function hasAgentSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

interface CreateDraftBody {
  submissionId?: string;
  recipientEmail?: string;
  recipientName?: string;
  question?: string;
  answerParagraphs?: string[];
  sources?: ReplySource[];
  judgeVerdict?: JudgeVerdict | null;
  draftedBy?: string;
}

/**
 * GET — list reply drafts for the admin surface. Optional ?submissionId, ?status.
 * Never returns source passages (they are not stored).
 */
export async function GET(request: NextRequest) {
  const session = await getAdminSessionOrNull();
  if (!session) return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });

  if (!process.env.DATABASE_URL?.trim()) return NextResponse.json({ items: [] });

  const submissionId = request.nextUrl.searchParams.get('submissionId')?.trim();
  const status = request.nextUrl.searchParams.get('status')?.trim();

  try {
    const items = await prisma.contactReplyDraft.findMany({
      where: {
        ...(submissionId ? { submissionId } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return NextResponse.json({ items });
  } catch (error) {
    console.error('[admin/contacts/reply-drafts] list failed:', error);
    return NextResponse.json({ detail: 'Failed to load drafts.' }, { status: 500 });
  }
}

/**
 * POST — create an IICRC-grounded reply draft. Callable by an admin session or by
 * the drafting agent (CRON_SECRET bearer). Runs the enforced no-verbatim guard
 * and FAILS CLOSED: a draft that shares an >= 8-gram run with a source is rejected
 * and never persisted.
 */
export async function POST(request: NextRequest) {
  const session = await getAdminSessionOrNull();
  if (!session && !hasAgentSecret(request)) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as CreateDraftBody;
  const sources = Array.isArray(body.sources) ? body.sources : [];
  const answerParagraphs = Array.isArray(body.answerParagraphs) ? body.answerParagraphs : [];

  // Resolve recipient/question from the linked submission when not supplied.
  let recipientEmail = body.recipientEmail?.trim();
  let recipientName = body.recipientName?.trim();
  let question = body.question?.trim() ?? '';
  const submissionId = body.submissionId?.trim();

  if (submissionId) {
    const submission = await prisma.contactSubmission.findUnique({ where: { id: submissionId } });
    if (!submission) return NextResponse.json({ detail: 'Submission not found' }, { status: 404 });
    recipientEmail ??= submission.email;
    recipientName ??= `${submission.firstName} ${submission.lastName}`.trim();
    if (!question) question = submission.message;
  }

  if (!recipientEmail) {
    return NextResponse.json({ detail: 'recipientEmail (or submissionId) required' }, { status: 400 });
  }

  // Compose the cited, disclaimered reply — throws if no answer or no citation.
  let replyBody: string;
  try {
    replyBody = buildContactReplyText({
      recipientName: recipientName || 'there',
      answerParagraphs,
      sources,
    });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : 'Invalid draft' },
      { status: 400 },
    );
  }

  // Enforced copyright guardrail — fail closed.
  const verbatim = validateReplyNoVerbatim(replyBody, sources, 8);
  if (!verbatim.ok) {
    return NextResponse.json(
      { detail: 'Draft rejected: verbatim source overlap', match: verbatim.match, ngramCheck: 'fail' },
      { status: 422 },
    );
  }

  const draftedBy = body.draftedBy?.trim() || (session ? `admin:${session.email}` : 'agent:carsi-contact-reply');
  // WS5: NEVER derive auto-send eligibility from a caller-supplied verdict — the
  // drafting model must not approve its own outbound email. Drafts are created
  // not-eligible; a human approves via PATCH (and the SLA cron is additionally
  // gated behind CONTACT_REPLY_AUTOSEND_ENABLED). The verdict is kept as advisory
  // provenance only.
  const autoSendEligible = false;
  const provenance = buildReplyProvenance({
    question,
    sources,
    draftedBy,
    judgeVerdict: body.judgeVerdict ?? null,
  });

  try {
    const draft = await prisma.contactReplyDraft.create({
      data: {
        submissionId: submissionId ?? null,
        recipientEmail,
        recipientName: recipientName || 'there',
        question,
        replyBody,
        standardsCited: citedStandards(sources),
        stormSources: provenance.stormSources,
        judgeVerdict: (body.judgeVerdict ?? undefined) as never,
        ngramCheck: 'pass',
        autoSendEligible,
        draftedBy,
        status: 'pending_approval',
      },
    });
    return NextResponse.json({ ok: true, id: draft.id, autoSendEligible });
  } catch (error) {
    console.error('[admin/contacts/reply-drafts] create failed:', error);
    return NextResponse.json({ detail: 'Failed to save draft.' }, { status: 500 });
  }
}

/**
 * PATCH — approve+send or discard a draft. Admin session only (this is the human
 * approval gate). Body: { id, action: 'send' | 'discard', replyBody? }.
 */
export async function PATCH(request: NextRequest) {
  const session = await getAdminSessionOrNull();
  if (!session) return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    id?: string;
    action?: string;
    replyBody?: string;
  };
  const id = body.id?.trim();
  const action = body.action?.trim();
  if (!id || (action !== 'send' && action !== 'discard')) {
    return NextResponse.json({ detail: "id and action ('send'|'discard') required" }, { status: 400 });
  }

  if (action === 'discard') {
    try {
      await prisma.contactReplyDraft.update({ where: { id }, data: { status: 'discarded' } });
      return NextResponse.json({ ok: true });
    } catch (error) {
      console.error('[admin/contacts/reply-drafts] discard failed:', error);
      return NextResponse.json({ detail: 'Failed to discard draft.' }, { status: 500 });
    }
  }

  const result = await dispatchContactReplyDraft({
    draftId: id,
    appOrigin: getAppOrigin(request),
    approvedBy: session.email,
    sentVia: 'human',
    replyBodyOverride: body.replyBody,
  });
  if (!result.ok) {
    const status = result.reason === 'not_found' ? 404 : result.reason === 'not_pending' ? 409 : 502;
    return NextResponse.json({ detail: `Send failed: ${result.reason}` }, { status });
  }
  return NextResponse.json({ ok: true });
}
