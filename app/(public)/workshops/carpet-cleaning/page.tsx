import type { Metadata } from 'next';

import { CarsiWorkshopPage } from '@/components/workshop/CarsiWorkshopPage';
import { getPublicSiteUrl } from '@/lib/env/public-url';
import { prisma } from '@/lib/prisma';
import {
  CARSI_WORKSHOP_COURSE_SLUG,
  CARSI_WORKSHOP_PATH,
  workshopAccessState,
} from '@/lib/server/carsi-workshop-access';
import { getServerSessionClaims } from '@/lib/server/session-server';
import { OG_IMAGES } from '@/lib/seo/og-image';
import { OG_LOCALE_FIELDS } from '@/lib/seo/locale';

// Access panel depends on the visitor's session and enrolment.
export const dynamic = 'force-dynamic';

const siteUrl = getPublicSiteUrl();

const DESCRIPTION =
  'CARSI two-day hands-on carpet cleaning workshop: fibre, chemistry, methods, upholstery, hard floors, business and machinery. Online course and participant manual free for roadshow attendees.';

export const metadata: Metadata = {
  title: 'CARSI Carpet Cleaning Workshop',
  description: DESCRIPTION,
  alternates: { canonical: `${siteUrl}${CARSI_WORKSHOP_PATH}` },
  openGraph: {
    ...OG_LOCALE_FIELDS,
    images: OG_IMAGES,
    title: 'CARSI Carpet Cleaning Workshop',
    description: DESCRIPTION,
    type: 'website',
    url: `${siteUrl}${CARSI_WORKSHOP_PATH}`,
  },
};

async function enrolmentStatusFor(userId: string): Promise<string | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;
  try {
    const row = await prisma.lmsEnrollment.findFirst({
      where: { studentId: userId, course: { slug: CARSI_WORKSHOP_COURSE_SLUG } },
      select: { status: true },
    });
    return row?.status ?? null;
  } catch (e) {
    // Fail closed: an unreadable enrolment shows the not-enrolled panel, never access.
    console.error('[workshops/carpet-cleaning] enrolment lookup failed', e);
    return null;
  }
}

export default async function CarsiCarpetCleaningWorkshopPage() {
  const claims = await getServerSessionClaims();
  const status = claims ? await enrolmentStatusFor(claims.sub) : null;
  return <CarsiWorkshopPage access={workshopAccessState(claims, status)} />;
}
