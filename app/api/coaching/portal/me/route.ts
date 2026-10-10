import { randomUUID } from 'node:crypto';

import { NextRequest, NextResponse } from 'next/server';

import type { CoachingPortalWorkspace } from '@/lib/coaching-portal/types';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { getCoachingPortalAccess } from '@/lib/server/carsi-coaching-portal-access';
import { requireCoachingPortalEditor } from '@/lib/server/carsi-coaching-portal-gate';
import { updateCoachingPortalWorkspace } from '@/lib/server/carsi-coaching-subscription-store';

export async function GET(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Sign in to open the coaching portal.' }, { status: 401 });
  }

  const access = await getCoachingPortalAccess(claims);
  return NextResponse.json(access);
}

export async function PATCH(request: NextRequest) {
  const gate = await requireCoachingPortalEditor(request);
  if ('error' in gate) return gate.error;
  const claims = gate.claims;

  const body = (await request.json().catch(() => null)) as Partial<CoachingPortalWorkspace> | null;
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ detail: 'Invalid body.' }, { status: 400 });
  }

  const workspace: CoachingPortalWorkspace = {
    horizontalSummary: typeof body.horizontalSummary === 'string' ? body.horizontalSummary : '',
    directionSummary: typeof body.directionSummary === 'string' ? body.directionSummary : '',
    sessionPrepNotes: typeof body.sessionPrepNotes === 'string' ? body.sessionPrepNotes : '',
    monthlyActions: Array.isArray(body.monthlyActions)
      ? body.monthlyActions
          .filter((a) => a && typeof a === 'object')
          .map((a) => {
            const item = a as CoachingPortalWorkspace['monthlyActions'][number];
            const status =
              item.status === 'todo' ||
              item.status === 'in_progress' ||
              item.status === 'done' ||
              item.status === 'blocked'
                ? item.status
                : 'todo';
            return {
              id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : randomUUID(),
              title: typeof item.title === 'string' ? item.title.slice(0, 500) : '',
              status,
            };
          })
          .filter((a) => a.title.trim())
          .slice(0, 40)
      : [],
  };

  try {
    const saved = await updateCoachingPortalWorkspace(claims.sub, workspace);
    return NextResponse.json({ workspace: saved });
  } catch (error) {
    console.error('[coaching/portal/me] save failed', error);
    return NextResponse.json({ detail: 'Failed to save.' }, { status: 500 });
  }
}
