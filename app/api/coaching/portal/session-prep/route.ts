import { NextRequest, NextResponse } from 'next/server';

import { saveCoachingSessionPrep } from '@/lib/server/carsi-coaching-session-prep';
import { requireCoachingPortalEditor } from '@/lib/server/carsi-coaching-portal-gate';

export async function POST(request: NextRequest) {
  const gate = await requireCoachingPortalEditor(request);
  if ('error' in gate) return gate.error;
  const claims = gate.claims;

  const body = (await request.json().catch(() => null)) as {
    notes?: string;
    notifyCoach?: boolean;
  } | null;

  const result = await saveCoachingSessionPrep(claims, {
    notes: typeof body?.notes === 'string' ? body.notes : '',
    notifyCoach: body?.notifyCoach !== false,
  });

  if (!result.ok) {
    return NextResponse.json({ detail: result.detail }, { status: 400 });
  }

  return NextResponse.json({ savedAt: result.savedAt });
}
