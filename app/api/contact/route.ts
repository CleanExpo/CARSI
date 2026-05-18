import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

import { emitCrmEvent } from '@/lib/server/crm-sync';
import { getAppOrigin } from '@/lib/server/app-url';
import { sendContactNotificationEmail } from '@/lib/server/transactional-email';
import { applyRateLimit, UNKNOWN_IP } from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';

interface ContactPayload {
  firstName: string;
  lastName: string;
  email: string;
  message: string;
}

const LIMIT = 5;
const WINDOW_MS = 60 * 60 * 1000;

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    UNKNOWN_IP
  );
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = applyRateLimit(ip, LIMIT, WINDOW_MS);
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          },
        },
      );
    }

    const body = (await req.json()) as ContactPayload;

    if (!body.firstName || !body.lastName || !body.email || !body.message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const email = body.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const submissionId = randomUUID();
    const ticketRef = submissionId.slice(0, 8).toUpperCase();

    if (process.env.DATABASE_URL?.trim()) {
      await prisma.contactSubmission.create({
        data: {
          id: submissionId,
          firstName: body.firstName.trim(),
          lastName: body.lastName.trim(),
          email,
          message: body.message.trim(),
          status: 'new',
          sourceIp: ip === UNKNOWN_IP ? null : ip,
        },
      });
    }

    const notifyTo =
      process.env.CONTACT_NOTIFY_EMAIL?.trim() ||
      process.env.ADMIN_EMAIL?.trim() ||
      'support@carsi.com.au';

    void emitCrmEvent('contact.created', {
      submission_id: submissionId,
      email,
      first_name: body.firstName.trim(),
      last_name: body.lastName.trim(),
      message: body.message.trim(),
      ticket_ref: ticketRef,
    });

    const emailResult = await sendContactNotificationEmail({
      appOrigin: getAppOrigin(req),
      ticketRef,
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      email,
      message: body.message.trim(),
      notifyTo,
    });

    if (!emailResult.sent) {
      console.warn('[contact] notification email not sent:', emailResult.reason, '→', notifyTo);
    }

    return NextResponse.json({ ok: true, reference: ticketRef });
  } catch (e) {
    console.error('[contact]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
