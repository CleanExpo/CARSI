import { NextRequest, NextResponse } from 'next/server';

import { signSessionToken } from '@/lib/auth/session-jwt';
import { notifyCrmEnrollmentCreated } from '@/lib/server/crm-enrollment-notify';
import { sendEnrollmentWelcomeEmail } from '@/lib/server/enrollment-email';
import { enrollStudentInCourse } from '@/lib/server/enrollment-service';
import { findOrCreateGuestUser } from '@/lib/server/guest-checkout';
import { getFirstLessonLearnPath } from '@/lib/server/first-lesson';
import { findCourseInExport } from '@/lib/server/local-course-checkout';
import { getOrCreateCourseBySlug } from '@/lib/server/course-catalog-sync';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

/** POST /api/lms/enrollments/guest-free — free course quick enrol without prior account. */
export async function POST(request: NextRequest) {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    slug?: string;
    email?: string;
    password?: string;
    full_name?: string;
  };

  const slug = body.slug?.trim().toLowerCase();
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? '';
  const fullName = body.full_name?.trim() ?? '';

  if (!slug || !email || password.length < 8) {
    return NextResponse.json(
      { detail: 'slug, email, and password (min 8 characters) required' },
      { status: 400 },
    );
  }

  let isFree = false;
  const wp = findCourseInExport(slug);
  if (wp) {
    const price = Number(wp.price_aud);
    isFree = wp.is_free === true || !Number.isFinite(price) || price <= 0;
  }
  try {
    const db = await getOrCreateCourseBySlug(slug);
    const listAud = Number(db.priceAud);
    isFree = isFree || db.isFree || !Number.isFinite(listAud) || listAud <= 0;
  } catch {
    if (!wp) {
      return NextResponse.json({ detail: 'Course not found' }, { status: 404 });
    }
  }

  if (!isFree) {
    return NextResponse.json({ detail: 'This course requires payment' }, { status: 403 });
  }

  try {
    const { claims } = await findOrCreateGuestUser({
      email,
      fullName: fullName || email.split('@')[0],
      password,
    });

    const result = await enrollStudentInCourse(claims, slug, 'free');
    const learnPath = (await getFirstLessonLearnPath(slug)) ?? '/dashboard/student';

    if (result !== 'already_enrolled') {
      void sendEnrollmentWelcomeEmail({
        studentId: claims.sub,
        courseSlug: slug,
        appOrigin: request.nextUrl.origin,
      }).catch((e) => console.error('[guest-free] email', e));
      notifyCrmEnrollmentCreated({
        enrollmentId: result.enrollmentId,
        studentId: claims.sub,
        courseId: result.courseId,
      });
    }

    const accessToken = await signSessionToken(claims);
    const response = NextResponse.json({ ok: true, learn_url: learnPath });

    const cookieOptions = {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    };
    response.cookies.set('auth_token', accessToken, { ...cookieOptions, httpOnly: true });
    response.cookies.set('carsi_token', accessToken, { ...cookieOptions, httpOnly: false });

    return response;
  } catch (e) {
    console.error('[guest-free]', e);
    return NextResponse.json({ detail: 'Enrolment failed' }, { status: 500 });
  }
}
