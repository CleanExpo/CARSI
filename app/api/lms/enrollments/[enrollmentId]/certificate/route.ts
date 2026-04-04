import { NextRequest, NextResponse } from 'next/server';

import { getUpstreamBaseUrl } from '@/lib/server/upstream-api';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { buildCompletionCertificatePdf } from '@/lib/server/certificate-pdf';
import { getEnrollmentForCertificate, markCertificateIssued } from '@/lib/server/enrollment-service';

type Ctx = { params: Promise<{ enrollmentId: string }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  const upstream = getUpstreamBaseUrl();
  if (upstream) {
    const { enrollmentId } = await ctx.params;
    const url = `${upstream.replace(/\/$/, '')}/api/lms/enrollments/${encodeURIComponent(enrollmentId)}/certificate`;
    const res = await fetch(url, {
      headers: {
        authorization: request.headers.get('authorization') ?? '',
        cookie: request.headers.get('cookie') ?? '',
      },
      cache: 'no-store',
    });
    if (!res.ok) {
      const buf = await res.arrayBuffer();
      return new NextResponse(buf, { status: res.status });
    }
    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="certificate.pdf"`,
      },
    });
  }

  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  const { enrollmentId } = await ctx.params;

  try {
    const row = await getEnrollmentForCertificate(claims.sub, enrollmentId);
    if (!row) {
      return NextResponse.json(
        { detail: 'Certificate available only after all lessons are complete.' },
        { status: 403 }
      );
    }

    const studentName = row.student.fullName?.trim() || row.student.email;
    const disc = row.course.iicrcDiscipline?.trim() || '—';
    const pdf = await buildCompletionCertificatePdf({
      studentName,
      courseTitle: row.course.title,
      completedDate: row.completedAt,
      discipline: disc,
    });

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
    console.error('[certificate]', e);
    return NextResponse.json({ detail: 'Failed to generate certificate' }, { status: 500 });
  }
}
