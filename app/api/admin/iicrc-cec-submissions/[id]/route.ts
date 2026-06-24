import { type NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import {
  getRenewalSubmissionDetail,
  updateRenewalSubmissionStatus,
} from '@/lib/server/iicrc-renewal-communication';
import { isRenewalStatus } from '@/types/iicrc-renewal';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  const { id } = await context.params;
  const submissionId = id.trim();
  if (!submissionId) {
    return NextResponse.json({ detail: 'Invalid submission id' }, { status: 400 });
  }

  const detail = await getRenewalSubmissionDetail(submissionId);
  if (!detail) {
    return NextResponse.json({ detail: 'Submission not found' }, { status: 404 });
  }

  return NextResponse.json({ submission: detail });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const submissionId = id.trim();
  if (!submissionId) {
    return NextResponse.json({ detail: 'Invalid submission id' }, { status: 400 });
  }

  let body: { renewalStatus?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON' }, { status: 400 });
  }

  const renewalStatus =
    typeof body.renewalStatus === 'string' ? body.renewalStatus.trim() : '';
  if (!isRenewalStatus(renewalStatus)) {
    return NextResponse.json({ detail: 'Invalid renewalStatus' }, { status: 400 });
  }

  const existing = await getRenewalSubmissionDetail(submissionId);
  if (!existing) {
    return NextResponse.json({ detail: 'Submission not found' }, { status: 404 });
  }

  await updateRenewalSubmissionStatus(submissionId, renewalStatus);
  const updated = await getRenewalSubmissionDetail(submissionId);
  return NextResponse.json({ ok: true, submission: updated });
}
