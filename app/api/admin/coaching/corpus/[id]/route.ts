import { NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { DEFAULT_COACHING_COACH } from '@/lib/coaching-portal/coach-routing';
import { isCarsiCoachingAssistantEnabled } from '@/lib/server/carsi-coaching-assistant-flag';
import {
  approveCoachCorpusItem,
  listCoachCorpus,
  removeCoachCorpusItem,
} from '@/lib/server/carsi-coaching-coach-corpus';
import { getCoachCorpusStore } from '@/lib/server/carsi-coaching-coach-corpus-store';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

/**
 * GP-631 one knowledge-base item. Admin (coach) only, the coach's own items only.
 * PATCH  → { action: 'approve' } lets Ask my coach use it
 * DELETE → removes it for good; Ask my coach stops using it immediately
 * Sign-in first (401), then the flag (404). Another coach's item reads as not found (404).
 */
async function gate() {
  if (!(await getAdminSessionOrNull())) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }
  if (!isCarsiCoachingAssistantEnabled()) {
    return NextResponse.json({ detail: 'Not found.' }, { status: 404 });
  }
  return null;
}

const NOT_FOUND = { detail: 'Item not found.' };

export async function PATCH(request: NextRequest, context: Params) {
  const denied = await gate();
  if (denied) return denied;

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (body?.action !== 'approve') {
    return NextResponse.json({ detail: 'Unsupported action.' }, { status: 400 });
  }
  const store = getCoachCorpusStore();
  const outcome = await approveCoachCorpusItem(store, DEFAULT_COACHING_COACH.id, id);
  if (outcome === 'not_found') return NextResponse.json(NOT_FOUND, { status: 404 });
  const items = await listCoachCorpus(store, DEFAULT_COACHING_COACH.id);
  return NextResponse.json({ ok: true, items });
}

export async function DELETE(_request: NextRequest, context: Params) {
  const denied = await gate();
  if (denied) return denied;

  const { id } = await context.params;
  const store = getCoachCorpusStore();
  const outcome = await removeCoachCorpusItem(store, DEFAULT_COACHING_COACH.id, id);
  if (outcome === 'not_found') return NextResponse.json(NOT_FOUND, { status: 404 });
  const items = await listCoachCorpus(store, DEFAULT_COACHING_COACH.id);
  return NextResponse.json({ ok: true, items });
}
