/**
 * GET /api/admin/unfulfilled-payments (GP-759) — paid Stripe checkouts and live subscriptions
 * the webhook could not fulfil, newest first. Unresolved records only: a later delivery or the
 * buyer's own success page marks a record resolved. Admin-only; nothing here emails anyone.
 */
import { NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { listUnresolvedUnfulfilledPayments } from '@/lib/server/payment-integrity-ledger';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }
  const payments = await listUnresolvedUnfulfilledPayments();
  return NextResponse.json({ payments });
}
