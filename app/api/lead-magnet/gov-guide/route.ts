import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

import { emitCrmEvent } from '@/lib/server/crm-sync';
import { getAppOrigin } from '@/lib/server/app-url';
import { sendGovContractorGuideEmail } from '@/lib/server/transactional-email';
import { applyRateLimit, UNKNOWN_IP } from '@/lib/rate-limit';
import { verifyTurnstileToken } from '@/lib/server/turnstile';
import { prisma } from '@/lib/prisma';
import { leadMagnetEnabled } from '@/lib/server/lead-magnet-flag';
import {
  GOV_GUIDE_DOWNLOAD_PATH,
  GOV_GUIDE_LEAD_STATUS,
  buildGovGuideLeadMessage,
  isValidLeadEmail,
  normaliseLeadEmail,
  sanitiseLeadContext,
  type LeadContext,
} from '@/lib/server/lead-magnet-capture';

interface Payload {
  email?: string;
  turnstileToken?: string;
  leadContext?: LeadContext;
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

/**
 * GP-199 lead-magnet capture. Mirrors the /api/contact pipeline: rate-limit →
 * Turnstile → email validation → persist lead (ContactSubmission, DB-guarded) →
 * CRM event → deliver the guide by email. Returns the download path so the form
 * can reveal the link immediately (soft gate: capture, then reveal + email).
 * Fail-closed when the feature flag is off.
 */
export async function POST(req: NextRequest) {
  if (!leadMagnetEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const ip = getClientIp(req);
    const rl = applyRateLimit(ip, LIMIT, WINDOW_MS);
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
        },
      );
    }

    const body = (await req.json()) as Payload;

    const turnstile = await verifyTurnstileToken(body.turnstileToken, ip);
    if (!turnstile.ok) {
      return NextResponse.json({ error: 'Verification failed. Please try again.' }, { status: 403 });
    }

    if (!isValidLeadEmail(body.email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }
    const email = normaliseLeadEmail(body.email);

    const submissionId = randomUUID();
    const leadContext = sanitiseLeadContext(body.leadContext);
    const message = buildGovGuideLeadMessage(leadContext);
    const origin = getAppOrigin(req).replace(/\/$/, '');
    const absoluteDownloadUrl = `${origin}${GOV_GUIDE_DOWNLOAD_PATH}`;

    if (process.env.DATABASE_URL?.trim()) {
      await prisma.contactSubmission.create({
        data: {
          id: submissionId,
          firstName: email.split('@')[0].slice(0, 120) || 'Lead',
          lastName: '(gov guide lead magnet)',
          email,
          message,
          status: GOV_GUIDE_LEAD_STATUS,
          sourceIp: ip === UNKNOWN_IP ? null : ip,
        },
      });
    }

    void emitCrmEvent('lead.captured', {
      submission_id: submissionId,
      email,
      lead_magnet: 'gov-contractor-guide',
      lead_source: leadContext.source,
      lead_topic: leadContext.topic,
      lead_intent: leadContext.intent,
      lead_page_url: leadContext.pageUrl,
    });

    const emailResult = await sendGovContractorGuideEmail({
      to: email,
      appOrigin: origin,
      downloadUrl: absoluteDownloadUrl,
    });
    if (!emailResult.sent) {
      console.warn('[lead-magnet/gov-guide] delivery email not sent:', emailResult.reason, '→', email);
    }

    // Relative path: the success card links it on the same origin.
    return NextResponse.json({ ok: true, downloadUrl: GOV_GUIDE_DOWNLOAD_PATH });
  } catch (e) {
    console.error('[lead-magnet/gov-guide]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
