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
  leadContext?: {
    source?: string;
    topic?: string;
    pathway?: string;
    intent?: string;
    pageUrl?: string;
  };
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

function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string'
    ? value.replace(/[<>]/g, '').trim().slice(0, maxLength) || undefined
    : undefined;
}

function buildLeadContextBlock(body: ContactPayload) {
  const source = cleanText(body.leadContext?.source, 48);
  const topic = cleanText(body.leadContext?.topic, 160);
  const pathway = cleanText(body.leadContext?.pathway, 80);
  const intent = cleanText(body.leadContext?.intent, 80);
  const pageUrl = cleanText(body.leadContext?.pageUrl, 240);
  const lines = [
    source ? `Lead source: ${source}` : null,
    topic ? `Lead topic: ${topic}` : null,
    pathway ? `Start Smart pathway: ${pathway}` : null,
    intent ? `Lead intent: ${intent}` : null,
    pageUrl ? `Source page: ${pageUrl}` : null,
  ].filter((line): line is string => Boolean(line));

  return {
    block: lines.length ? lines.join('\n') : '',
    source,
    topic,
    pathway,
    intent,
    pageUrl,
  };
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
    const message = body.message.trim();
    const leadContext = buildLeadContextBlock(body);
    const enrichedMessage = [leadContext.block, message].filter(Boolean).join('\n\n');

    if (process.env.DATABASE_URL?.trim()) {
      await prisma.contactSubmission.create({
        data: {
          id: submissionId,
          firstName: body.firstName.trim(),
          lastName: body.lastName.trim(),
          email,
          message: enrichedMessage,
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
      message: enrichedMessage,
      ticket_ref: ticketRef,
      lead_source: leadContext.source,
      lead_topic: leadContext.topic,
      lead_pathway: leadContext.pathway,
      lead_intent: leadContext.intent,
      lead_page_url: leadContext.pageUrl,
    });

    const emailResult = await sendContactNotificationEmail({
      appOrigin: getAppOrigin(req),
      ticketRef,
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      email,
      message: enrichedMessage,
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
