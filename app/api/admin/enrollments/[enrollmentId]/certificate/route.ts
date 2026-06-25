import { type NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import {
  buildCompletionCertificatePdf,
  completionCertificateDataFromEnrollment,
} from '@/lib/server/certificate-pdf';
import { getEnrollmentForCertificate, markCertificateIssued } from '@/lib/server/enrollment-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

type RouteContext = { params: Promise<{ enrollmentId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  const { enrollmentId } = await context.params;
  const id = typeof enrollmentId === 'string' ? enrollmentId.trim() : '';
  if (!id) {
    return NextResponse.json({ detail: 'Invalid enrollment id' }, { status: 400 });
  }

  const studentId = request.nextUrl.searchParams.get('studentId')?.trim() ?? '';
  if (!studentId) {
    return NextResponse.json({ detail: 'studentId query parameter is required' }, { status: 400 });
  }

  try {
    const row = await getEnrollmentForCertificate(studentId, id);
    if (!row) {
      return NextResponse.json(
        { detail: 'Certificate is available only after the course is fully complete.' },
        { status: 403 },
      );
    }

    const origin =
      process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      process.env.NEXT_PUBLIC_FRONTEND_URL?.trim() ||
      new URL(request.url).origin;

    const pdf = await buildCompletionCertificatePdf(
      completionCertificateDataFromEnrollment(row, origin),
    );

    await markCertificateIssued(row.id);

    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="carsi-certificate-${row.course.slug}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('[admin/certificate]', e);
    return NextResponse.json({ detail: 'Failed to generate certificate' }, { status: 500 });
  }
}
