import { NextRequest, NextResponse } from 'next/server';

import { getUpstreamBaseUrl } from '@/lib/server/upstream-api';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import {
  buildCompletionCertificatePdf,
  completionCertificateDataFromEnrollment,
} from '@/lib/server/certificate-pdf';
import { canIssueCertificate } from '@/lib/server/certificate-name';
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

    // A certificate must name its holder (#302). Don't mint one addressed to an
    // email/email-prefix — require the learner to add their name first.
    if (!canIssueCertificate(row.student)) {
      return NextResponse.json(
        {
          detail: 'Add your full name to your profile before downloading your certificate.',
          code: 'name_required',
        },
        { status: 422 }
      );
    }

    const origin =
      process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      new URL(request.url).origin;
    const pdf = await buildCompletionCertificatePdf(
      completionCertificateDataFromEnrollment(row, origin)
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
    console.error('[certificate]', e);
    return NextResponse.json({ detail: 'Failed to generate certificate' }, { status: 500 });
  }
}
