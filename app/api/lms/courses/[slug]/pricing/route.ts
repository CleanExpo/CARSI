import { NextRequest, NextResponse } from 'next/server';

import { verifySessionToken } from '@/lib/auth/session-jwt';
import { computeDiscountedAud, findActiveUserDiscount } from '@/lib/server/user-discounts';
import { getOrCreateCourseBySlug } from '@/lib/server/course-catalog-sync';

type Params = { params: Promise<{ slug: string }> };

/**
 * Effective price for the signed-in learner (list vs discount). Anonymous users get list only.
 */
export async function GET(request: NextRequest, context: Params) {
  const { slug: raw } = await context.params;
  const slug = raw?.trim().toLowerCase() ?? '';
  if (!slug) {
    return NextResponse.json({ detail: 'slug required' }, { status: 400 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  let course: { id: string; priceAud: unknown; isFree: boolean; title: string };
  try {
    const c = await getOrCreateCourseBySlug(slug);
    course = { id: c.id, priceAud: c.priceAud, isFree: c.isFree, title: c.title };
  } catch {
    return NextResponse.json({ detail: 'Course not found' }, { status: 404 });
  }

  const listPriceAud = Number(course.priceAud);
  const listFree = course.isFree === true || !Number.isFinite(listPriceAud) || listPriceAud <= 0;

  const token = request.cookies.get('auth_token')?.value;
  let userId: string | null = null;
  if (token) {
    const claims = await verifySessionToken(token);
    if (claims?.sub) userId = claims.sub;
  }

  if (!userId) {
    return NextResponse.json({
      slug,
      title: course.title,
      listPriceAud: listFree ? 0 : listPriceAud,
      payableAud: listFree ? 0 : listPriceAud,
      hasDiscount: false,
      isFree: listFree,
    });
  }

  const discount = await findActiveUserDiscount(userId, course.id);
  if (!discount) {
    return NextResponse.json({
      slug,
      title: course.title,
      listPriceAud: listFree ? 0 : listPriceAud,
      payableAud: listFree ? 0 : listPriceAud,
      hasDiscount: false,
      isFree: listFree,
    });
  }

  const base = listFree ? 0 : listPriceAud;
  const payableAud = computeDiscountedAud(base, discount);
  const effectiveFree = listFree || payableAud <= 0;

  return NextResponse.json({
    slug,
    title: course.title,
    listPriceAud: listFree ? 0 : listPriceAud,
    payableAud: effectiveFree ? 0 : payableAud,
    hasDiscount: true,
    discountType: discount.discountType,
    isFree: effectiveFree,
  });
}
