import { type NextRequest, NextResponse } from 'next/server';

import {
  countPublishedCoursesForYearlyMembership,
  grantYearlyMembership,
} from '@/lib/admin/admin-yearly-membership';
import { getAdminSessionOrNull } from '@/lib/admin/admin-session';

export async function GET() {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  const publishedCourseCount = await countPublishedCoursesForYearlyMembership();
  return NextResponse.json({ publishedCourseCount });
}

export async function POST(request: NextRequest) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  let body: {
    email?: string;
    fullName?: string;
    pricingMode?: string;
    priceAud?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : undefined;
  const pricingMode = body.pricingMode === 'custom' ? 'custom' : 'free';

  let priceAud = 0;
  if (pricingMode === 'custom') {
    const raw = body.priceAud;
    priceAud =
      typeof raw === 'number'
        ? raw
        : typeof raw === 'string'
          ? Number.parseFloat(raw)
          : Number.NaN;
    if (!Number.isFinite(priceAud) || priceAud < 0) {
      return NextResponse.json({ detail: 'Enter a valid lump-sum price (AUD)' }, { status: 400 });
    }
  }

  if (!email || !email.includes('@')) {
    return NextResponse.json({ detail: 'A valid email address is required' }, { status: 400 });
  }

  try {
    const result = await grantYearlyMembership({
      email,
      fullName,
      priceAud,
      appOrigin: request.nextUrl.origin,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'INVALID_EMAIL') {
      return NextResponse.json({ detail: 'Invalid email address' }, { status: 400 });
    }
    if (msg === 'INVALID_PRICE') {
      return NextResponse.json({ detail: 'Invalid price' }, { status: 400 });
    }
    if (msg === 'NO_PUBLISHED_COURSES') {
      return NextResponse.json(
        { detail: 'No published courses in the catalogue to grant' },
        { status: 400 },
      );
    }
    if (msg === 'ENROLLMENT_FAILED') {
      return NextResponse.json(
        { detail: 'Could not enroll the learner in any course' },
        { status: 500 },
      );
    }
    console.error('[admin/yearly-membership]', e);
    return NextResponse.json({ detail: 'Failed to grant Yearly Membership' }, { status: 500 });
  }
}
