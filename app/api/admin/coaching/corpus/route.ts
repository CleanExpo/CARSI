import { NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { DEFAULT_COACHING_COACH } from '@/lib/coaching-portal/coach-routing';
import { isCarsiCoachingAssistantEnabled } from '@/lib/server/carsi-coaching-assistant-flag';
import { addCoachCorpusItem, listCoachCorpus } from '@/lib/server/carsi-coaching-coach-corpus';
import { getCoachCorpusStore } from '@/lib/server/carsi-coaching-coach-corpus-store';

export const dynamic = 'force-dynamic';

/**
 * GP-631 coach knowledge base. Admin (coach) only.
 * GET  → the coach's own items (approved and not yet approved), with their full text
 * POST → { sourceType, title, body, provenanceUrl? } adds an item, unapproved
 * Sign-in is checked first (401), then the feature flag (404). The coach is the session's
 * coach: admins act as the default coach until GP-632 (A5) adds per-coach accounts. A coach
 * id in the request body is ignored.
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

export async function GET() {
  const denied = await gate();
  if (denied) return denied;
  const items = await listCoachCorpus(getCoachCorpusStore(), DEFAULT_COACHING_COACH.id);
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const denied = await gate();
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const store = getCoachCorpusStore();
  const result = await addCoachCorpusItem(store, DEFAULT_COACHING_COACH.id, body);
  if (result.status === 'invalid') {
    return NextResponse.json({ detail: result.error }, { status: 400 });
  }
  if (result.status === 'refused_standards') {
    return NextResponse.json(
      {
        detail:
          'This looks like text copied from an IICRC standard. Standards text cannot be added to the assistant. Reference the standard by name instead.',
      },
      { status: 422 }
    );
  }
  const items = await listCoachCorpus(store, DEFAULT_COACHING_COACH.id);
  return NextResponse.json({ ok: true, item: result.item, items });
}
