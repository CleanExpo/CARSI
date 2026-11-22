/**
 * GET /api/lms/credentials/[credentialId]       — JSON credential data
 * GET /api/lms/credentials/[credentialId]?pdf=1 — PDF download
 *
 * With upstream: proxies to legacy API (with local DB fallback if unreachable).
 * Without upstream: serves from Postgres (completed enrollments).
 */

import { NextRequest, NextResponse } from 'next/server';

import { applyRateLimit, clientIpFrom } from '@/lib/rate-limit';
import {
  getPublicCredentialJson,
  getPublicCredentialPdfBuffer,
} from '@/lib/server/credential-public';
import { getUpstreamBaseUrl } from '@/lib/server/upstream-api';

type Ctx = { params: Promise<{ credentialId: string }> };

// Public, unauthenticated credential verification (WS4 / P0-D). The id is a random
// UUIDv4 (unguessable) and a revoked cert already 404s (WS3), but there is no auth,
// so a per-IP limit throttles bulk scraping of the endpoint if a set of ids leaks.
// Generous for a legitimate employer verifying a handful of credentials.
const CREDENTIAL_VERIFY_LIMIT = 30;
const CREDENTIAL_VERIFY_WINDOW_MS = 60_000;

async function respondFromLocalDatabase(
  request: NextRequest,
  credentialId: string,
  wantPdf: boolean
): Promise<NextResponse> {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Credential not found' }, { status: 404 });
  }

  if (wantPdf) {
    const result = await getPublicCredentialPdfBuffer(credentialId);
    if (!result.ok) {
      return NextResponse.json({ detail: 'Certificate not found' }, { status: 404 });
    }
    return new NextResponse(Buffer.from(result.pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  }

  const origin = request.nextUrl.origin;
  const json = await getPublicCredentialJson(credentialId, origin);
  if (!json) {
    return NextResponse.json({ detail: 'Credential not found' }, { status: 404 });
  }
  return NextResponse.json(json, { headers: { 'Cache-Control': 'no-store' } });
}

export async function GET(request: NextRequest, ctx: Ctx) {
  const ip = clientIpFrom(
    request.headers.get('x-forwarded-for'),
    request.headers.get('x-real-ip'),
  );
  const rl = applyRateLimit(`credential-verify:${ip}`, CREDENTIAL_VERIFY_LIMIT, CREDENTIAL_VERIFY_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { detail: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000))) },
      },
    );
  }

  const { credentialId } = await ctx.params;
  const wantPdf = request.nextUrl.searchParams.get('pdf') === '1';

  const upstream = getUpstreamBaseUrl();
  if (upstream) {
    try {
      const suffix = wantPdf ? '/pdf' : '';
      const base = upstream.replace(/\/$/, '');
      const backendRes = await fetch(
        `${base}/api/lms/credentials/${encodeURIComponent(credentialId)}${suffix}`,
        { cache: 'no-store' }
      );

      if (backendRes.ok) {
        if (wantPdf) {
          const pdfBuffer = await backendRes.arrayBuffer();
          return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `inline; filename="certificate-${credentialId.slice(0, 8)}.pdf"`,
              'Cache-Control': 'no-store',
            },
          });
        }
        const data = await backendRes.json();
        return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
      }
    } catch (e) {
      console.warn('[credentials] upstream credential fetch failed, using local DB:', e);
    }
  }

  return respondFromLocalDatabase(request, credentialId, wantPdf);
}
