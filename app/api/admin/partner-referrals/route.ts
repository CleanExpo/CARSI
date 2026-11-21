import { NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { parseReferralPartnerId } from '@/lib/partners/referral-partners';
import { getPartnerReferralSalesCsv } from '@/lib/server/partner-referral-sales';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/partner-referrals?partner=ccw
 *
 * GP-767: settlement CSV of course sales that came through a partner's referral link: date,
 * course, amount actually paid, refunded yes/no (and amount), dispute not won. Admin only.
 */
export async function GET(request: NextRequest) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  const partnerId = parseReferralPartnerId(request.nextUrl.searchParams.get('partner'));
  if (!partnerId) {
    return NextResponse.json({ detail: 'Unknown or missing partner.' }, { status: 400 });
  }

  try {
    const csv = await getPartnerReferralSalesCsv(partnerId);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${partnerId}-referral-sales.csv"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('[admin/partner-referrals] failed:', error);
    return NextResponse.json({ detail: 'Partner referral report unavailable.' }, { status: 500 });
  }
}
