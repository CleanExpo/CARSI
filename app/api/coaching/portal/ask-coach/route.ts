import { NextRequest, NextResponse } from 'next/server';

import { getCoachKnowledgeBase } from '@/lib/coaching-portal/coach-knowledge-base';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { askMyCoach, listMyCoachQuestions } from '@/lib/server/carsi-coaching-ask-coach';
import { getAskCoachStore } from '@/lib/server/carsi-coaching-ask-coach-store';
import { isCarsiCoachingAssistantEnabled } from '@/lib/server/carsi-coaching-assistant-flag';
import { requireCoachingPortalEditor } from '@/lib/server/carsi-coaching-portal-gate';

export const dynamic = 'force-dynamic';

/**
 * GP-630 "Ask my coach" for coaching members.
 * GET  → the caller's own questions to their coach (with any answers)
 * POST → { question } — answered from the coach's material with sources, or sent to the coach
 * Sign-in is checked first (401), then the feature flag (404), then the subscription (403).
 * The member and coach always come from the session, never from the request.
 */
async function gate(request: NextRequest) {
  if (!(await getSessionClaimsFromRequest(request))) {
    return { error: NextResponse.json({ detail: 'Sign in required.' }, { status: 401 }) };
  }
  if (!isCarsiCoachingAssistantEnabled()) {
    return { error: NextResponse.json({ detail: 'Not found.' }, { status: 404 }) };
  }
  return requireCoachingPortalEditor(request);
}

export async function GET(request: NextRequest) {
  const g = await gate(request);
  if ('error' in g) return g.error;
  const questions = await listMyCoachQuestions(getAskCoachStore(), g.claims.sub);
  return NextResponse.json({ questions });
}

export async function POST(request: NextRequest) {
  const g = await gate(request);
  if ('error' in g) return g.error;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const store = getAskCoachStore();
  const result = await askMyCoach(store, getCoachKnowledgeBase, g.claims.sub, body?.question);
  if (result.status === 'invalid') {
    return NextResponse.json(
      { detail: 'Ask a question between 5 and 1000 characters.' },
      { status: 400 }
    );
  }
  const questions = await listMyCoachQuestions(store, g.claims.sub);
  return NextResponse.json({ result, questions });
}
