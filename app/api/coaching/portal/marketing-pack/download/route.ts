import { NextRequest, NextResponse } from 'next/server';

import {
  isMarketingPackDownloadId,
  MARKETING_PACK_DOWNLOADS,
  renderCalendarCsv,
  renderChecklistMarkdown,
  renderReviewMarkdown,
} from '@/lib/coaching-portal/marketing-pack/downloads';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { getLatestMarketingPackForUser } from '@/lib/server/carsi-coaching-marketing-pack';

export const dynamic = 'force-dynamic';

/** GP-634: download one resource item from the member's latest marketing pack. */
export async function GET(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) return NextResponse.json({ detail: 'Sign in required.' }, { status: 401 });

  const item = request.nextUrl.searchParams.get('item');
  if (!isMarketingPackDownloadId(item)) {
    return NextResponse.json({ detail: 'Unknown download.' }, { status: 400 });
  }
  const pack = await getLatestMarketingPackForUser(claims.sub);
  if (!pack) return NextResponse.json({ detail: 'No marketing pack yet.' }, { status: 404 });

  const meta = MARKETING_PACK_DOWNLOADS.find((d) => d.id === item)!;
  const body =
    item === 'review'
      ? renderReviewMarkdown(pack.review, pack.voice, pack.generatedAt)
      : item === 'checklist'
        ? renderChecklistMarkdown(pack.checklist, pack.voice, pack.generatedAt)
        : renderCalendarCsv(pack.calendar);

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': meta.contentType,
      'Content-Disposition': `attachment; filename="${meta.filename}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
