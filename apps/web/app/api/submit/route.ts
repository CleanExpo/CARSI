import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/* ─── Types ───────────────────────────────────────────────────────────────── */

const VALID_TYPES = [
  'podcast',
  'youtube_channel',
  'professional',
  'event',
  'job',
  'article',
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
}

interface HubSubmissionInsert {
  submission_type: SubmissionType;
  status: 'pending';
  submitter_name: string;
  submitter_email: string;
  submitter_phone: string | null;
  submitter_company: string | null;
  submitter_role: string | null;
  submission_title: string;
  submission_url: string | null;
  submission_description: string | null;
  submission_data: Record<string, never>;
  terms_accepted: boolean;
  guidelines_accepted: boolean;
  ip_address: string | null;
  user_agent: string | null;
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

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

/* ─── Route handler ───────────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  /* 1. Parse body */
  let body: SubmissionPayload;
  try {
    body = (await req.json()) as SubmissionPayload;
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 });
  }

  /* 2. Validate required fields */
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
  if (!body.terms_accepted) {
    return NextResponse.json(
      { success: false, error: 'terms_accepted must be true.' },
      { status: 400 }
    );
  }
  if (!body.guidelines_accepted) {
    return NextResponse.json(
      { success: false, error: 'guidelines_accepted must be true.' },
      { status: 400 }
    );
  }

  /* 3. Resolve Supabase credentials */
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[submit] Supabase credentials not configured');
    return NextResponse.json(
      { success: false, error: 'Service temporarily unavailable. Please try again later.' },
      { status: 503 }
    );
  }

  /* 4. Build insert record */
  const record: HubSubmissionInsert = {
    submission_type: body.submission_type as SubmissionType,
    status: 'pending',
    submitter_name: body.submitter_name.trim(),
    submitter_email: body.submitter_email.trim().toLowerCase(),
    submitter_phone: nullify(body.submitter_phone),
    submitter_company: nullify(body.submitter_company),
    submitter_role: nullify(body.submitter_role),
    submission_title: body.submission_title.trim(),
    submission_url: nullify(body.submission_url),
    submission_description: nullify(body.submission_description),
    submission_data: {},
    terms_accepted: true,
    guidelines_accepted: true,
    ip_address: getClientIp(req),
    user_agent: req.headers.get('user-agent'),
  };

  /* 5. Insert via Supabase REST API */
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/hub_submissions`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(record),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[submit] Supabase insert failed (${res.status}): ${text}`);
      return NextResponse.json(
        { success: false, error: 'Failed to save submission. Please try again.' },
        { status: 502 }
      );
    }

    const rows = (await res.json()) as { id: string }[];
    const id = rows[0]?.id ?? null;

    return NextResponse.json({ success: true, id }, { status: 200 });
  } catch (err) {
    console.error('[submit] Unexpected error during Supabase insert:', err);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
