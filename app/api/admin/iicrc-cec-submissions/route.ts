import { type NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { getAppOrigin } from '@/lib/server/app-url';
import {
  listIicrcCecSubmissionsForAdmin,
} from '@/lib/server/iicrc-cec-submission';
import { listRenewalSubmissionsForStudent } from '@/lib/server/iicrc-renewal-communication';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ManualSendBody = {
  submissionId?: string;
  enrollmentId?: string;
  studentId?: string;
  iicrcMemberNumber?: string;
  iicrc_member_number?: string;
  cecHours?: number | string;
  cec_hours?: number | string;
};

function parseOptionalPositiveNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function readManualSendFields(body: ManualSendBody) {
  const enrollmentId = typeof body.enrollmentId === 'string' ? body.enrollmentId.trim() : '';
  const studentId = typeof body.studentId === 'string' ? body.studentId.trim() : '';
  const iicrcMemberNumber =
    (typeof body.iicrcMemberNumber === 'string' ? body.iicrcMemberNumber : body.iicrc_member_number)?.trim() ||
    '';
  const cecHours = parseOptionalPositiveNumber(body.cecHours ?? body.cec_hours);
  return { enrollmentId, studentId, iicrcMemberNumber, cecHours };
}

function triggerIicrcBackgroundProcess(
  request: NextRequest,
  payload: Record<string, unknown>,
): { ok: true } | { ok: false; detail: string } {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return {
      ok: false,
      detail:
        'Background processing is not configured (CRON_SECRET). Set it on the server so IICRC sends can complete without timing out.',
    };
  }

  const origin = getAppOrigin(request);
  const url = `${origin}/api/admin/iicrc-cec-submissions/process`;

  void fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(payload),
  }).catch((e) => console.error('[admin/iicrc-cec-submissions] background trigger failed', e));

  return { ok: true };
}

export async function GET(request: NextRequest) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  const studentId = request.nextUrl.searchParams.get('studentId')?.trim() ?? '';
  if (studentId) {
    const submissions = await listRenewalSubmissionsForStudent(studentId);
    return NextResponse.json({ submissions });
  }

  const submissions = await listIicrcCecSubmissionsForAdmin({ limit: 200 });
  return NextResponse.json({ submissions });
}

export async function POST(request: NextRequest) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  let body: ManualSendBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON' }, { status: 400 });
  }

  const { enrollmentId, studentId, iicrcMemberNumber, cecHours } = readManualSendFields(body);

  if (enrollmentId && studentId) {
    if (!iicrcMemberNumber) {
      return NextResponse.json(
        {
          detail:
            'iicrcMemberNumber is required in the request body when sending a manual IICRC renewal email.',
        },
        { status: 400 },
      );
    }

    const triggered = triggerIicrcBackgroundProcess(request, {
      enrollmentId,
      studentId,
      iicrcMemberNumber,
      cecHours,
      initiatedByAdminEmail: session.email,
    });

    if (!triggered.ok) {
      return NextResponse.json({ detail: triggered.detail }, { status: 503 });
    }

    return NextResponse.json(
      {
        ok: true,
        status: 'processing',
        detail:
          'IICRC renewal email is being sent in the background. Refresh this page in a moment, or check Admin → IICRC CEC for the communication log.',
        iicrcMemberNumber,
        cecHours,
      },
      { status: 202 },
    );
  }

  const submissionId = typeof body.submissionId === 'string' ? body.submissionId.trim() : '';
  if (!submissionId) {
    return NextResponse.json(
      {
        detail:
          'submissionId or enrollmentId + studentId + iicrcMemberNumber are required',
      },
      { status: 400 },
    );
  }

  const triggered = triggerIicrcBackgroundProcess(request, {
    submissionId,
    initiatedByAdminEmail: session.email,
  });

  if (!triggered.ok) {
    return NextResponse.json({ detail: triggered.detail }, { status: 503 });
  }

  return NextResponse.json(
    {
      ok: true,
      status: 'processing',
      detail: 'IICRC retry is running in the background. Check the communication log shortly.',
    },
    { status: 202 },
  );
}
