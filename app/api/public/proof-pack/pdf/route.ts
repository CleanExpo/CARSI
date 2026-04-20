import { type NextRequest, NextResponse } from 'next/server';

import { verifyProofPackShareToken } from '@/lib/auth/session-jwt';
import { buildProofPackPdf } from '@/lib/server/proof-pack-pdf';
import { getProofPackPayloadForStudent } from '@/lib/server/proof-pack';

export const dynamic = 'force-dynamic';

/**
 * GET — public PDF for a training record when `t` is a valid share token.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('t')?.trim();
  if (!token) {
    return NextResponse.json({ detail: 'Missing token' }, { status: 400 });
  }

  const userId = await verifyProofPackShareToken(token);
  if (!userId) {
    return NextResponse.json({ detail: 'Invalid or expired link' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Service unavailable' }, { status: 503 });
  }

  const payload = await getProofPackPayloadForStudent(userId, request.nextUrl.origin);
  if (!payload) {
    return NextResponse.json({ detail: 'Not found' }, { status: 404 });
  }

  const pdf = await buildProofPackPdf(payload);
  const stamp = new Date().toISOString().slice(0, 10);
  const safeName = payload.learner_name.replace(/[^\w\-]+/g, '-').slice(0, 40);
  const filename = `carsi-training-record-${safeName || 'learner'}-${stamp}.pdf`;

  return new NextResponse(Buffer.from(pdf), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
