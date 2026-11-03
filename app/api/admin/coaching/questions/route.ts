import { NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { DEFAULT_COACHING_COACH } from '@/lib/coaching-portal/coach-routing';
import { answerCoachQuestion, listCoachInbox } from '@/lib/server/carsi-coaching-ask-coach';
import { getAskCoachStore } from '@/lib/server/carsi-coaching-ask-coach-store';
import { isCarsiCoachingAssistantEnabled } from '@/lib/server/carsi-coaching-assistant-flag';

export const dynamic = 'force-dynamic';

/**
 * GP-630 coach inbox for "Ask my coach". Admin (coach) only.
 * GET  → open questions members sent to the coach
 * POST → { id, answer } — answers a question once; the member sees it in the portal
 * Admins act as the default coach until GP-632 (A5) adds per-coach accounts.
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
  const questions = await listCoachInbox(getAskCoachStore(), DEFAULT_COACHING_COACH.id);
  return NextResponse.json({ questions });
}

export async function POST(request: NextRequest) {
  const denied = await gate();
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const id = typeof body?.id === 'string' ? body.id : '';
  const store = getAskCoachStore();
  const outcome = await answerCoachQuestion(store, DEFAULT_COACHING_COACH.id, id, body?.answer);

  if (outcome === 'invalid') {
    return NextResponse.json(
      { detail: 'Write an answer (up to 4000 characters).' },
      { status: 400 }
    );
  }
  if (outcome === 'not_found') {
    return NextResponse.json({ detail: 'Question not found.' }, { status: 404 });
  }
  if (outcome === 'already_answered') {
    return NextResponse.json(
      { detail: 'This question has already been answered.' },
      { status: 409 }
    );
  }
  const questions = await listCoachInbox(store, DEFAULT_COACHING_COACH.id);
  return NextResponse.json({ ok: true, questions });
}
