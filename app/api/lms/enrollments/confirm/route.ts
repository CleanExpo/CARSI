import { NextRequest, NextResponse } from 'next/server';

import { getStripeClient } from '@/lib/api/stripe';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { notifyCrmEnrollmentCreated } from '@/lib/server/crm-enrollment-notify';
import { sendEnrollmentWelcomeEmail } from '@/lib/server/enrollment-email';
import { enrollStudentInCourse } from '@/lib/server/enrollment-service';
import { getFirstLessonLearnPath } from '@/lib/server/first-lesson';
import { findCourseInExport } from '@/lib/server/local-course-checkout';
import { computeDiscountedAud, findActiveUserDiscount } from '@/lib/server/user-discounts';
import { getOrCreateCourseBySlug } from '@/lib/server/course-catalog-sync';

/**
 * Finalise enrolment after Stripe Checkout (session_id) or confirm free enrolment
 * (catalog free, or admin "100% free" discount).
 */
export async function POST(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  const json = (await request.json().catch(() => ({}))) as {
    slug?: string;
    session_id?: string;
  };

  let slug = typeof json.slug === 'string' ? json.slug.trim().toLowerCase() : '';
  const sessionId = typeof json.session_id === 'string' ? json.session_id.trim() : '';

  let paymentReference: string;

  if (sessionId) {
    if (!process.env.STRIPE_SECRET_KEY?.trim()) {
      return NextResponse.json({ detail: 'Stripe not configured' }, { status: 503 });
    }
    try {
      const stripe = getStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== 'paid') {
        return NextResponse.json({ detail: 'Payment not completed' }, { status: 400 });
      }
      const metaSlug = session.metadata?.course_slug?.trim().toLowerCase();
      if (!metaSlug) {
        return NextResponse.json({ detail: 'Missing course on session' }, { status: 400 });
      }
      slug = metaSlug;
      const email = session.customer_email ?? session.customer_details?.email;
      if (
        email &&
        claims.email &&
        email.toLowerCase() !== claims.email.toLowerCase()
      ) {
        return NextResponse.json({ detail: 'Session email does not match account' }, { status: 403 });
      }
    } catch (e) {
      console.error('[enrollments/confirm] stripe', e);
      return NextResponse.json({ detail: 'Invalid checkout session' }, { status: 400 });
    }
    paymentReference = sessionId;
  } else {
    if (!slug) {
      return NextResponse.json({ detail: 'slug or session_id required' }, { status: 400 });
    }

    const wp = findCourseInExport(slug);
    const price = wp ? Number(wp.price_aud) : NaN;
    const isFreeCatalog = wp?.is_free === true || !Number.isFinite(price) || price <= 0;

    if (isFreeCatalog) {
      paymentReference = 'free';
    } else {
      let dbCourse: { id: string; priceAud: unknown };
      try {
        dbCourse = await getOrCreateCourseBySlug(slug);
      } catch {
        return NextResponse.json({ detail: 'Course not found' }, { status: 404 });
      }
      const disc = await findActiveUserDiscount(claims.sub, dbCourse.id);
      if (disc) {
        const listAud = Number(dbCourse.priceAud);
        const finalAud = computeDiscountedAud(listAud, disc);
        if (disc.discountType === 'free' || finalAud <= 0) {
          paymentReference = `discount:${disc.id}`;
        } else {
          return NextResponse.json(
            { detail: 'Paid courses require a valid Stripe session_id' },
            { status: 403 }
          );
        }
      } else {
        return NextResponse.json(
          { detail: 'Paid courses require a valid Stripe session_id' },
          { status: 403 }
        );
      }
    }
  }

  if (!slug) {
    return NextResponse.json({ detail: 'Course slug required' }, { status: 400 });
  }

  try {
    const result = await enrollStudentInCourse(claims, slug, paymentReference);
    const learnUrl = (await getFirstLessonLearnPath(slug)) ?? '/dashboard/student';
    if (result === 'already_enrolled') {
      return NextResponse.json({ ok: true, already_enrolled: true, learn_url: learnUrl });
    }

    void sendEnrollmentWelcomeEmail({
      studentId: claims.sub,
      courseSlug: slug,
      origin: request.nextUrl.origin,
    }).catch((e) => console.error('[enrollments/confirm] email', e));

    notifyCrmEnrollmentCreated({
      enrollmentId: result.enrollmentId,
      studentId: claims.sub,
      courseId: result.courseId,
    });

    return NextResponse.json({
      ok: true,
      enrollment_id: result.enrollmentId,
      course_id: result.courseId,
      learn_url: learnUrl,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'COURSE_NOT_FOUND') {
      return NextResponse.json({ detail: 'Course not found' }, { status: 404 });
    }
    console.error('[enrollments/confirm]', e);
    return NextResponse.json({ detail: 'Enrolment failed' }, { status: 500 });
  }
}
