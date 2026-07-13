import { NextRequest, NextResponse } from 'next/server';

import { signSessionToken } from '@/lib/auth/session-jwt';
import { applyRateLimit, clientIpFrom, UNKNOWN_IP } from '@/lib/rate-limit';
import { notifyCrmEnrollmentCreated } from '@/lib/server/crm-enrollment-notify';
import { sendEnrollmentWelcomeEmail } from '@/lib/server/enrollment-email';
import { enrollStudentInCourse } from '@/lib/server/enrollment-service';
import { findOrCreateGuestUser } from '@/lib/server/guest-checkout';
import { getFirstLessonLearnPath } from '@/lib/server/first-lesson';
import { getOrCreateCourseBySlug } from '@/lib/server/course-catalog-sync';
import { captureServerError } from '@/lib/server/sentry';
import { verifyTurnstileToken } from '@/lib/server/turnstile';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
// Anonymous account-creation endpoint — cap per-IP attempts so it can't be used
// to spray passwords/emails (defence-in-depth alongside Turnstile). RA-3022.
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 60 * 1000;

/** POST /api/lms/enrollments/guest-free — free course quick enrol without prior account. */
export async function POST(request: NextRequest) {
  const ip = clientIpFrom(
    request.headers.get('x-forwarded-for'),
    request.headers.get('x-real-ip'),
  );
  const rl = applyRateLimit(ip, RATE_LIMIT, RATE_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { detail: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      },
    );
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    slug?: string;
    email?: string;
    password?: string;
    full_name?: string;
    turnstileToken?: string;
  };

  const turnstile = await verifyTurnstileToken(body.turnstileToken, ip === UNKNOWN_IP ? null : ip);
  if (!turnstile.ok) {
    return NextResponse.json({ detail: 'Verification failed. Please try again.' }, { status: 403 });
  }

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
  try {
    const db = await getOrCreateCourseBySlug(slug);
    const listAud = Number(db.priceAud);
    isFree = db.isFree || !Number.isFinite(listAud) || listAud <= 0;
  } catch {
    return NextResponse.json({ detail: 'Course not found' }, { status: 404 });
  }

  if (!isFree) {
    return NextResponse.json({ detail: 'This course requires payment' }, { status: 403 });
  }

  try {
    // Never pass allowClaim here — this endpoint is unauthenticated, so an email
    // that already belongs to an account must NOT be mutated or signed in.
    const outcome = await findOrCreateGuestUser({
      email,
      fullName: fullName || email.split('@')[0],
      password,
    });

    if (outcome.status === 'exists') {
      // Neutral response — the account already exists; the user signs in to enrol.
      // (Behavioural note: a brand-new email is enrolled + signed in while an
      // existing one is not, so existence is not perfectly indistinguishable;
      // Turnstile + the per-IP limit above blunt enumeration. Fully closing it
      // would require an email-verification enrol flow — out of this fix's scope.)
      return NextResponse.json({
        ok: true,
        requires_sign_in: true,
        learn_url: `/login?next=${encodeURIComponent(`/courses/${slug}`)}`,
      });
    }

    const { claims } = outcome;
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
    response.cookies.set('carsi_token', accessToken, { ...cookieOptions, httpOnly: true });

    return response;
  } catch (e) {
    console.error('[guest-free]', e);
    void captureServerError(e, { route: '/api/lms/enrollments/guest-free' });
    return NextResponse.json({ detail: 'Enrolment failed' }, { status: 500 });
  }
}
