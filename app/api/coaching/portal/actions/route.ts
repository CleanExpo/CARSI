import { NextRequest, NextResponse } from 'next/server';

import type { CoachingActionStatus } from '@/lib/coaching-portal/types';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import {
  deleteCoachingActionForUser,
  listCoachingActionsForUser,
  upsertCoachingActionForUser,
} from '@/lib/server/carsi-coaching-actions-store';
import { decideCoachingPortalEntitlement } from '@/lib/server/carsi-coaching-entitlement';
import { getCoachingPortalRowForUser } from '@/lib/server/carsi-coaching-subscription-store';

function parseStatus(raw: unknown): CoachingActionStatus {
  if (raw === 'todo' || raw === 'in_progress' || raw === 'done' || raw === 'blocked') return raw;
  return 'todo';
}

export async function GET(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) return NextResponse.json({ detail: 'Sign in required.' }, { status: 401 });
  const items = await listCoachingActionsForUser(claims.sub);
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) return NextResponse.json({ detail: 'Sign in required.' }, { status: 401 });

  const sub = await getCoachingPortalRowForUser(claims.sub);
  const entitlement = decideCoachingPortalEntitlement(
    sub ? { status: sub.status, currentPeriodEnd: sub.currentPeriodEnd } : null
  );
  if (!entitlement.entitled) {
    return NextResponse.json({ detail: 'Active coaching subscription required.' }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.title !== 'string' || !body.title.trim()) {
    return NextResponse.json({ detail: 'Title required.' }, { status: 400 });
  }

  await upsertCoachingActionForUser(claims.sub, {
    id: typeof body.id === 'string' ? body.id : undefined,
    title: body.title,
    description: typeof body.description === 'string' ? body.description : null,
    status: parseStatus(body.status),
    priority: typeof body.priority === 'string' ? body.priority : null,
    progressNote: typeof body.progressNote === 'string' ? body.progressNote : null,
    dueDate: typeof body.dueDate === 'string' && body.dueDate ? new Date(body.dueDate) : null,
  });

  const items = await listCoachingActionsForUser(claims.sub);
  return NextResponse.json({ items });
}

export async function DELETE(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) return NextResponse.json({ detail: 'Sign in required.' }, { status: 401 });

  const sub = await getCoachingPortalRowForUser(claims.sub);
  const entitlement = decideCoachingPortalEntitlement(
    sub ? { status: sub.status, currentPeriodEnd: sub.currentPeriodEnd } : null
  );
  if (!entitlement.entitled) {
    return NextResponse.json({ detail: 'Active coaching subscription required.' }, { status: 403 });
  }

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ detail: 'Missing id.' }, { status: 400 });

  const ok = await deleteCoachingActionForUser(claims.sub, id);
  if (!ok) return NextResponse.json({ detail: 'Not found.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
