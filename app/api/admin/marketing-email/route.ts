import { NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import {
  MAX_MARKETING_RECIPIENTS,
  sendAdminMarketingEmails,
} from '@/lib/server/admin-marketing-email';
import {
  listMarketingRecipientIdsForSelectAll,
  listMarketingRecipients,
  parseMarketingListPageSize,
} from '@/lib/server/admin-marketing-list';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  const selectAll = request.nextUrl.searchParams.get('selectAll') === '1';

  try {
    if (selectAll) {
      const { users, total } = await listMarketingRecipientIdsForSelectAll(q);
      return NextResponse.json({
        users,
        total,
        cappedSelectAll: Math.min(total, MAX_MARKETING_RECIPIENTS),
      });
    }

    const page = Math.max(
      1,
      Number.parseInt(request.nextUrl.searchParams.get('page') ?? '1', 10) || 1
    );
    const pageSize = parseMarketingListPageSize(request.nextUrl.searchParams.get('pageSize'));
    const result = await listMarketingRecipients({ q, page, pageSize });
    return NextResponse.json(result);
  } catch (e) {
    console.error('[admin/marketing-email] list', e);
    return NextResponse.json({ detail: 'Could not load customers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    userIds?: unknown;
    subject?: unknown;
    body?: unknown;
    bodyHtml?: unknown;
    imageUrl?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON' }, { status: 400 });
  }

  const userIds = Array.isArray(body.userIds)
    ? body.userIds.filter((id): id is string => typeof id === 'string')
    : [];
  const subject = typeof body.subject === 'string' ? body.subject : '';
  const message = typeof body.body === 'string' ? body.body : '';
  const bodyHtml = typeof body.bodyHtml === 'string' ? body.bodyHtml : null;
  const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl : null;

  try {
    const result = await sendAdminMarketingEmails({
      userIds,
      subject,
      body: message,
      bodyHtml,
      imageUrl,
    });
    console.info(
      JSON.stringify({
        ts: new Date().toISOString(),
        kind: 'admin_marketing_email',
        admin_email: session.email,
        sent: result.sent,
        skippedOptOut: result.skippedOptOut,
        failed: result.failed,
      })
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const code = e instanceof Error ? e.message : 'SEND_FAILED';
    if (code === 'EMAIL_NOT_CONFIGURED') {
      return NextResponse.json(
        { detail: 'Email is not configured. Set MAILTRAP_API_KEY.' },
        { status: 503 }
      );
    }
    if (code === 'NO_RECIPIENTS') {
      return NextResponse.json({ detail: 'Select at least one customer.' }, { status: 400 });
    }
    if (code === 'TOO_MANY_RECIPIENTS') {
      return NextResponse.json(
        { detail: `Select at most ${MAX_MARKETING_RECIPIENTS} customers per send.` },
        { status: 400 }
      );
    }
    if (code === 'INVALID_SUBJECT') {
      return NextResponse.json({ detail: 'Add a subject (max 120 characters).' }, { status: 400 });
    }
    if (code === 'INVALID_BODY' || code === 'INVALID_BODY_HTML') {
      return NextResponse.json({ detail: 'Add the email body.' }, { status: 400 });
    }
    console.error('[admin/marketing-email] send', e);
    return NextResponse.json({ detail: 'Send failed' }, { status: 500 });
  }
}
