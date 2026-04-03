import { NextRequest, NextResponse } from 'next/server';

import { revokeDiscount } from '@/lib/admin/admin-discounts-service';
import { getAdminSessionOrNull } from '@/lib/admin/admin-session';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Params) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ detail: 'Missing id' }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as { action?: unknown };
  if (body.action !== 'revoke') {
    return NextResponse.json({ detail: 'Unsupported action' }, { status: 400 });
  }

  try {
    await revokeDiscount(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[admin/discounts PATCH]', e);
    return NextResponse.json({ detail: 'Revoke failed' }, { status: 500 });
  }
}
