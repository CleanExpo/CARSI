import { type NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import {
  addRenewalSubmissionNote,
  getRenewalSubmissionDetail,
} from '@/lib/server/iicrc-renewal-communication';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const submissionId = id.trim();
  if (!submissionId) {
    return NextResponse.json({ detail: 'Invalid submission id' }, { status: 400 });
  }

  let body: {
    body?: string;
    followUpAction?: string;
    followUpDueAt?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON' }, { status: 400 });
  }

  const noteBody = typeof body.body === 'string' ? body.body.trim() : '';
  if (!noteBody) {
    return NextResponse.json({ detail: 'Note body is required' }, { status: 400 });
  }

  const existing = await getRenewalSubmissionDetail(submissionId);
  if (!existing) {
    return NextResponse.json({ detail: 'Submission not found' }, { status: 404 });
  }

  const followUpAction =
    typeof body.followUpAction === 'string' ? body.followUpAction.trim() : null;
  let followUpDueAt: Date | null = null;
  if (typeof body.followUpDueAt === 'string' && body.followUpDueAt.trim()) {
    const parsed = new Date(body.followUpDueAt);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ detail: 'Invalid followUpDueAt' }, { status: 400 });
    }
    followUpDueAt = parsed;
  }

  const note = await addRenewalSubmissionNote({
    submissionId,
    authorAdminEmail: session.email,
    body: noteBody,
    followUpAction: followUpAction || null,
    followUpDueAt,
  });

  return NextResponse.json({ ok: true, note });
}
