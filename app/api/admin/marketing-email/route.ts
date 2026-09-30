import { NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { prisma } from '@/lib/prisma';
import {
  MAX_MARKETING_RECIPIENTS,
  sendAdminMarketingEmails,
} from '@/lib/server/admin-marketing-email';

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
  try {
    const users = await prisma.lmsUser.findMany({
      where: {
        isActive: true,
        emailOptOut: false,
        ...(q.length >= 3
          ? {
              OR: [
                { email: { contains: q, mode: 'insensitive' as const } },
                { fullName: { contains: q, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      select: { id: true, email: true, fullName: true },
      take: q.length >= 3 ? 40 : 50,
      orderBy: { email: 'asc' },
    });
    return NextResponse.json({ users });
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
  const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl : null;

  try {
    const result = await sendAdminMarketingEmails({
      userIds,
      subject,
      body: message,
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
    if (code === 'INVALID_BODY') {
      return NextResponse.json(
        { detail: 'Add the email body (max 8,000 characters).' },
        { status: 400 }
      );
    }
    console.error('[admin/marketing-email] send', e);
    return NextResponse.json({ detail: 'Send failed' }, { status: 500 });
  }
}
