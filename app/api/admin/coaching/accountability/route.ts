import { NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { DEFAULT_COACHING_COACH } from '@/lib/coaching-portal/coach-routing';
import { getCoachAccountabilityView } from '@/lib/server/carsi-coaching-accountability';
import { isCarsiCoachingAccountabilityEnabled } from '@/lib/server/carsi-coaching-accountability-flag';
import { getAccountabilityStore } from '@/lib/server/carsi-coaching-accountability-store';

export const dynamic = 'force-dynamic';

/**
 * GP-635 coach view: members who need attention (silent 21 days, or two blocked actions on
 * one goal) and a one-line status for every member with check-ins set up. Admin (coach)
 * only. Admins act as the default coach until GP-632 (A5) adds per-coach accounts, so the
 * coach is never taken from the request.
 */
export async function GET() {
  if (!(await getAdminSessionOrNull())) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }
  if (!isCarsiCoachingAccountabilityEnabled()) {
    return NextResponse.json({ detail: 'Not found.' }, { status: 404 });
  }
  const view = await getCoachAccountabilityView(
    getAccountabilityStore(),
    DEFAULT_COACHING_COACH.id,
    new Date()
  );
  return NextResponse.json(view);
}
