/**
 * GP-267: Credential Verification — Next.js proxy
 *
 * GET /api/lms/credentials/[credentialId]       — JSON credential data
 * GET /api/lms/credentials/[credentialId]?pdf=1 — PDF download
 *
 * Proxies to Python backend /api/lms/credentials/{credentialId}[/pdf]
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ credentialId: string }> }
) {
  const { credentialId } = await params;
  const wantPdf = request.nextUrl.searchParams.get('pdf') === '1';

  try {
    const suffix = wantPdf ? '/pdf' : '';
    const backendRes = await fetch(`${BACKEND_URL}/api/lms/credentials/${credentialId}${suffix}`);

    if (!backendRes.ok) {
      const errData = await backendRes.json().catch(() => ({ error: 'Not found' }));
      return NextResponse.json(errData, { status: backendRes.status });
    }

    if (wantPdf) {
      const pdfBuffer = await backendRes.arrayBuffer();
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="certificate-${credentialId.slice(0, 8)}.pdf"`,
        },
      });
    }

    const data = await backendRes.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[GP-267] Credential proxy error:', error);
    return NextResponse.json({ error: 'Failed to fetch credential' }, { status: 500 });
  }
}
