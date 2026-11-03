import { NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { prisma } from '@/lib/prisma';
import { createCoachingCoach, listCoachingCoaches } from '@/lib/server/carsi-coaching-coaches';

export const dynamic = 'force-dynamic';

/** Coaching chapters (GP-632): admin lists coaches and opens partner chapters. */
export async function GET() {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }
  try {
    return NextResponse.json({ coaches: await listCoachingCoaches() });
  } catch (error) {
    console.error('[admin/business-coaching/coaches]', error);
    return NextResponse.json({ detail: 'Failed to load coaches.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  // The coach's own CARSI login: without it nobody could open the chapter's dashboard.
  const coachLoginEmail =
    typeof body.coachLoginEmail === 'string' ? body.coachLoginEmail.trim().toLowerCase() : '';
  if (!coachLoginEmail) {
    return NextResponse.json(
      { detail: "Enter the coach's CARSI login email so they can open their dashboard." },
      { status: 400 }
    );
  }
  // Revenue-share terms are deliberately not accepted here: they need Phill's sign-off first.
  try {
    const coachUser = await prisma.lmsUser.findUnique({
      where: { email: coachLoginEmail },
      select: { id: true },
    });
    if (!coachUser) {
      return NextResponse.json(
        { detail: 'No CARSI account uses that coach login email. Ask the coach to register first.' },
        { status: 404 }
      );
    }
    const result = await createCoachingCoach({
      displayName: String(body.displayName ?? ''),
      chapterSlug: String(body.chapterSlug ?? ''),
      chapterName: String(body.chapterName ?? ''),
      currency: String(body.currency ?? ''),
      monthlyPriceCents:
        typeof body.monthlyPriceCents === 'number' ? body.monthlyPriceCents : null,
      stripePriceId: typeof body.stripePriceId === 'string' ? body.stripePriceId : null,
      notificationEmail: String(body.notificationEmail ?? ''),
      brandColour: typeof body.brandColour === 'string' ? body.brandColour : null,
      logoUrl: typeof body.logoUrl === 'string' ? body.logoUrl : null,
      userId: coachUser.id,
    });
    if (!result.ok) return NextResponse.json({ detail: result.detail }, { status: 400 });
    return NextResponse.json({ coach: result.coach }, { status: 201 });
  } catch (error) {
    console.error('[admin/business-coaching/coaches POST]', error);
    return NextResponse.json({ detail: 'Failed to create coach.' }, { status: 500 });
  }
}
