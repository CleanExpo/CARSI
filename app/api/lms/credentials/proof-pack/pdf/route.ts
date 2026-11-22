import { type NextRequest, NextResponse } from 'next/server';

import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { buildProofPackPdf } from '@/lib/server/proof-pack-pdf';
import { getProofPackPayloadForStudent } from '@/lib/server/proof-pack';

export const dynamic = 'force-dynamic';

/**
 * GET — PDF training & CEC summary for the signed-in learner.
 */
export async function GET(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  const payload = await getProofPackPayloadForStudent(claims.sub, request.nextUrl.origin);
  if (!payload) {
    return NextResponse.json({ detail: 'Not found' }, { status: 404 });
  }

  const pdf = await buildProofPackPdf(payload);
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `carsi-training-record-${stamp}.pdf`;

  return new NextResponse(Buffer.from(pdf), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
