import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { applyRateLimit, UNKNOWN_IP } from '@/lib/rate-limit';
import { emitCrmEvent } from '@/lib/server/crm-sync';
import { createHubSubmission } from '@/lib/server/hub-submission-store';
import { sendHubSubmissionNotificationEmail } from '@/lib/server/transactional-email';
import { verifyTurnstileToken } from '@/lib/server/turnstile';

const LIMIT = 5;
const WINDOW_MS = 60 * 60 * 1000;

const VALID_TYPES = [
  'podcast',
  'youtube_channel',
  'professional',
  'event',
  'job',
  'article',
  'case_study',
  'news_source',
] as const;

type SubmissionType = (typeof VALID_TYPES)[number];

interface SubmissionPayload {
  submission_type: string;
  submitter_name: string;
  submitter_email: string;
  submitter_phone?: string;
  submitter_company?: string;
  submitter_role?: string;
  submission_title: string;
  submission_url?: string;
  submission_description?: string;
  terms_accepted: boolean;
  guidelines_accepted: boolean;
  turnstileToken?: string;
  leadContext?: {
    source?: string;
    intent?: string;
    pageUrl?: string;
  };
}

function isValidType(value: string): value is SubmissionType {
  return (VALID_TYPES as readonly string[]).includes(value);
}

function nullify(value: string | undefined): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function getClientIp(req: NextRequest): string | null {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    null
  );
}

function getClientIpForLimit(req: NextRequest): string {
  return getClientIp(req) ?? UNKNOWN_IP;
}

function cleanLeadValue(value: unknown, maxLength: number): string | undefined {
  return typeof value === 'string'
    ? value.replace(/[<>]/g, '').trim().slice(0, maxLength) || undefined
    : undefined;
}

async function forwardToLegacyHubIntake(
  apiUrl: string,
  record: Record<string, unknown>,
  intakeSecret?: string
): Promise<boolean> {
  const forwardHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (intakeSecret?.trim()) {
    forwardHeaders['X-Internal-Auth'] = intakeSecret.trim();
  }

  try {
    const res = await fetch(`${apiUrl.replace(/\/$/, '')}/api/hub/submissions/intake`, {
      method: 'POST',
      headers: forwardHeaders,
      body: JSON.stringify(record),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const ip = getClientIpForLimit(req);
  const rl = applyRateLimit(ip, LIMIT, WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { success: false, error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  let body: SubmissionPayload;
  try {
    body = (await req.json()) as SubmissionPayload;
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 });
  }

  const turnstile = await verifyTurnstileToken(body.turnstileToken, ip);
  if (!turnstile.ok) {
    return NextResponse.json(
      { success: false, error: 'Verification failed. Please try again.' },
      { status: 403 }
    );
  }

  if (!body.submitter_name?.trim()) {
    return NextResponse.json(
      { success: false, error: 'submitter_name is required.' },
      { status: 400 }
    );
  }
  if (!body.submitter_email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.submitter_email)) {
    return NextResponse.json(
      { success: false, error: 'A valid submitter_email is required.' },
      { status: 400 }
    );
  }
  if (!body.submission_title?.trim()) {
    return NextResponse.json(
      { success: false, error: 'submission_title is required.' },
      { status: 400 }
    );
  }
  if (!isValidType(body.submission_type)) {
    return NextResponse.json(
      {
        success: false,
        error: `submission_type must be one of: ${VALID_TYPES.join(', ')}.`,
      },
      { status: 400 }
    );
  }
  if (!body.terms_accepted || !body.guidelines_accepted) {
    return NextResponse.json(
      { success: false, error: 'You must accept the terms and submission guidelines.' },
      { status: 400 }
    );
  }

  const leadSource = cleanLeadValue(body.leadContext?.source, 48);
  const leadIntent = cleanLeadValue(body.leadContext?.intent, 80);
  const leadPageUrl = cleanLeadValue(body.leadContext?.pageUrl, 240);

  const submissionData: Record<string, unknown> = {};
  if (leadSource) submissionData.lead_source = leadSource;
  if (leadIntent) submissionData.lead_intent = leadIntent;
  if (leadPageUrl) submissionData.lead_page_url = leadPageUrl;

  const saved = await createHubSubmission({
    submissionType: body.submission_type,
    submitterName: body.submitter_name.trim(),
    submitterEmail: body.submitter_email.trim().toLowerCase(),
    submitterPhone: nullify(body.submitter_phone),
    submitterCompany: nullify(body.submitter_company),
    submitterRole: nullify(body.submitter_role),
    submissionTitle: body.submission_title.trim(),
    submissionUrl: nullify(body.submission_url),
    submissionDescription: nullify(body.submission_description),
    submissionData,
    termsAccepted: true,
    guidelinesAccepted: true,
    ipAddress: getClientIp(req),
    userAgent: req.headers.get('user-agent'),
  });

  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (apiUrl) {
    void forwardToLegacyHubIntake(
      apiUrl,
      {
        submission_type: body.submission_type,
        status: 'pending',
        submitter_name: body.submitter_name.trim(),
        submitter_email: body.submitter_email.trim().toLowerCase(),
        submitter_phone: nullify(body.submitter_phone),
        submitter_company: nullify(body.submitter_company),
        submitter_role: nullify(body.submitter_role),
        submission_title: body.submission_title.trim(),
        submission_url: nullify(body.submission_url),
        submission_description: nullify(body.submission_description),
        submission_data: submissionData,
        terms_accepted: true,
        guidelines_accepted: true,
        ip_address: getClientIp(req),
        user_agent: req.headers.get('user-agent'),
      },
      process.env.HUB_INTAKE_SECRET
    );
  }

  if (!saved && !apiUrl) {
    console.error('[submit] DATABASE_URL and NEXT_PUBLIC_API_URL are both unavailable');
    return NextResponse.json(
      { success: false, error: 'Service temporarily unavailable. Please try again later.' },
      { status: 503 }
    );
  }

  const reference = saved?.reference ?? 'QUEUED';
  const notifyTo =
    process.env.CONTACT_NOTIFY_EMAIL?.trim() ||
    process.env.ADMIN_EMAIL?.trim() ||
    'support@carsi.com.au';

  void emitCrmEvent('hub.submission.created', {
    submission_id: saved?.id ?? null,
    submission_type: body.submission_type,
    submitter_email: body.submitter_email.trim().toLowerCase(),
    submission_title: body.submission_title.trim(),
    reference,
    lead_source: leadSource,
    lead_intent: leadIntent,
    lead_page_url: leadPageUrl,
  });

  void sendHubSubmissionNotificationEmail({
    notifyTo,
    submissionType: body.submission_type,
    reference,
    submitterName: body.submitter_name.trim(),
    submitterEmail: body.submitter_email.trim().toLowerCase(),
    submissionTitle: body.submission_title.trim(),
    submissionUrl: nullify(body.submission_url),
    submissionDescription: nullify(body.submission_description),
    leadSource: leadSource ?? null,
  }).catch((error) => {
    console.warn('[submit] notification email not sent:', error);
  });

  return NextResponse.json({ success: true, reference }, { status: 200 });
}
