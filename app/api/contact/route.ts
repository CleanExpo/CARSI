import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

import { sendEmail } from '@/lib/server/email';
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

    await sendEmail({
      to: notifyTo,
      replyTo: email,
      subject: `[CARSI Contact #${ticketRef}] ${body.firstName} ${body.lastName}`,
      html: `
        <p><strong>Reference:</strong> ${ticketRef}</p>
        <p><strong>From:</strong> ${body.firstName} ${body.lastName} &lt;${email}&gt;</p>
        <p>${body.message.trim().replace(/\n/g, '<br>')}</p>
        <p><em>View in admin: /admin/contacts</em></p>
      `,
      text: `Ref ${ticketRef}\nFrom: ${body.firstName} ${body.lastName} <${email}>\n\n${body.message.trim()}`,
    });

    return NextResponse.json({ ok: true, reference: ticketRef });
  } catch (e) {
    console.error('[contact]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
