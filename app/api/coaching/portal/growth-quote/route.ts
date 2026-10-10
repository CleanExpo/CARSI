import { NextRequest, NextResponse } from 'next/server';

import { submitCoachingGrowthQuoteRequest } from '@/lib/server/carsi-coaching-growth-quote';
import { requireCoachingPortalEditor } from '@/lib/server/carsi-coaching-portal-gate';

export async function POST(request: NextRequest) {
  const gate = await requireCoachingPortalEditor(request);
  if ('error' in gate) return gate.error;
  const claims = gate.claims;

  const body = (await request.json().catch(() => null)) as {
    serviceId?: string;
    message?: string;
  } | null;
  if (!body?.serviceId?.trim()) {
    return NextResponse.json({ detail: 'Select a service.' }, { status: 400 });
  }

  const result = await submitCoachingGrowthQuoteRequest(claims, {
    serviceId: body.serviceId,
    message: typeof body.message === 'string' ? body.message : '',
  });

  if (!result.ok) {
    return NextResponse.json({ detail: result.detail }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
