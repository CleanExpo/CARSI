import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { applyRateLimit, UNKNOWN_IP } from '@/lib/rate-limit';
import { verifyTurnstile } from '@/lib/turnstile';

interface ContactPayload {
  firstName: string;
  lastName: string;
  email: string;
  message: string;
  cfTurnstileResponse?: string;
}

// RA-3022 — rate limit + Cloudflare Turnstile on anonymous PII intake.
// 5 submissions per hour per IP (defense-in-depth alongside Turnstile +
// Cloudflare WAF). One hour = 3_600_000 ms.
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
    // 1. Rate limit BEFORE parsing body so abusers cost less per request.
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

    // 2. Basic validation
    if (!body.firstName || !body.lastName || !body.email || !body.message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 3. Turnstile CAPTCHA — required.
    const tsToken =
      body.cfTurnstileResponse ?? req.headers.get('cf-turnstile-response');
    if (!tsToken) {
      return NextResponse.json({ error: 'CAPTCHA required.' }, { status: 400 });
    }
    const ts = await verifyTurnstile(tsToken, ip === UNKNOWN_IP ? null : ip);
    if (!ts.success) {
      return NextResponse.json(
        { error: 'CAPTCHA verification failed.' },
        { status: 401 },
      );
    }

    // Persist or forward contact submissions here (e.g. email provider, CRM) when configured.

    // Always return success to the user; failures are non-blocking
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
