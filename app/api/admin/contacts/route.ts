import { NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { prisma } from '@/lib/prisma';

type LeadContext = {
  source?: string;
  topic?: string;
  pathway?: string;
  intent?: string;
  page_url?: string;
};

const LEAD_PREFIXES = {
  'Lead source': 'source',
  'Lead topic': 'topic',
  'Start Smart pathway': 'pathway',
  'Lead intent': 'intent',
  'Source page': 'page_url',
} as const;

function parseLeadContext(message: string): { leadContext: LeadContext; cleanMessage: string } {
  const [maybeHeader, ...rest] = message.split(/\n\s*\n/);
  const leadContext: LeadContext = {};
  const lines = maybeHeader?.split('\n') ?? [];
  let matched = 0;

  for (const line of lines) {
    const [rawKey, ...valueParts] = line.split(':');
    const key = rawKey?.trim() as keyof typeof LEAD_PREFIXES;
    const field = LEAD_PREFIXES[key];
    const value = valueParts.join(':').trim();

    if (field && value) {
      leadContext[field] = value;
      matched += 1;
    }
  }

  if (!matched) {
    return { leadContext, cleanMessage: message };
  }

  return {
    leadContext,
    cleanMessage: rest.join('\n\n').trim() || message,
  };
}

/** GET /api/admin/contacts — list contact submissions (newest first). */
export async function GET(request: NextRequest) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ items: [] });
  }

  const status = request.nextUrl.searchParams.get('status')?.trim();
  const leadIntent = request.nextUrl.searchParams.get('lead_intent')?.trim();
  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') ?? 50), 100);

  try {
    const items = await prisma.contactSubmission.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(leadIntent ? { message: { contains: `Lead intent: ${leadIntent}` } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        replyDrafts: {
          where: { status: 'pending_approval' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return NextResponse.json({
      items: items.map((r) => {
        const parsed = parseLeadContext(r.message);
        const draft = r.replyDrafts[0];

        return {
          id: r.id,
          first_name: r.firstName,
          last_name: r.lastName,
          email: r.email,
          message: parsed.cleanMessage,
          raw_message: r.message,
          lead_context: parsed.leadContext,
          status: r.status,
          source_ip: r.sourceIp,
          created_at: r.createdAt.toISOString(),
          pending_draft: draft
            ? {
                id: draft.id,
                reply_body: draft.replyBody,
                standards_cited: draft.standardsCited,
                auto_send_eligible: draft.autoSendEligible,
                drafted_by: draft.draftedBy,
                created_at: draft.createdAt.toISOString(),
              }
            : null,
        };
      }),
    });
  } catch (error) {
    console.error('[admin/contacts] list failed:', error);
    return NextResponse.json({ detail: 'Failed to load contacts.' }, { status: 500 });
  }
}

/** PATCH /api/admin/contacts — update status. Body: { id, status } */
export async function PATCH(request: NextRequest) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { id?: string; status?: string };
  const id = body.id?.trim();
  const status = body.status?.trim();
  if (!id || !status) {
    return NextResponse.json({ detail: 'id and status required' }, { status: 400 });
  }

  const allowed = new Set(['new', 'read', 'replied', 'archived']);
  if (!allowed.has(status)) {
    return NextResponse.json({ detail: 'Invalid status' }, { status: 400 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  try {
    await prisma.contactSubmission.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin/contacts] update failed:', error);
    return NextResponse.json({ detail: 'Failed to update contact.' }, { status: 500 });
  }
}
