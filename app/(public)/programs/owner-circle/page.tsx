import type { Metadata } from 'next';

import { BusinessCoachingContent } from '@/components/marketing/BusinessCoachingPage';
import { getPublicSiteUrl } from '@/lib/env/public-url';
import {
  businessCoachingPath,
  businessCoachingProductName,
  businessCoachingSeatPriceCents,
  formatAudFromCents,
} from '@/lib/marketing/business-coaching';
import {
  carsiCoachingMonthlyPriceLabel,
  carsiCoachingProductName,
} from '@/lib/marketing/carsi-coaching-monthly';
import { ccwRoadshowTitle } from '@/lib/marketing/ccw-roadshow';

// The business-offers comparison shows a date-dependent Growth Days price (free, paid or TBA by
// sitting), so refresh hourly rather than freezing it at build time.
export const revalidate = 3600;

const siteUrl = getPublicSiteUrl();
const canonical = `${siteUrl}${businessCoachingPath}`;
// Read from the constants the checkouts use, so the page title cannot drift from the charge.
const seatPrice = formatAudFromCents(businessCoachingSeatPriceCents);

export const metadata: Metadata = {
  title: `${businessCoachingProductName} — ${seatPrice} per seat, monthly group session`,
  description:
    `Monthly after-hours owner meetups at ${seatPrice} per seat, booked one session at a time. Separate from the ${carsiCoachingMonthlyPriceLabel} ${carsiCoachingProductName} subscription and the one-off two-day ${ccwRoadshowTitle}. Book on CARSI with Stripe.`,
  alternates: { canonical },
  openGraph: {
    title: `${businessCoachingProductName} — ${seatPrice} per seat`,
    description:
      `Small-business monthly group sessions at ${seatPrice} per seat. Separate from ${carsiCoachingProductName} (${carsiCoachingMonthlyPriceLabel}) and the two-day Business Growth Days.`,
    url: canonical,
    type: 'website',
    images: ['/og-image.png'],
  },
};

export default function OwnerCirclePage() {
  return <BusinessCoachingContent />;
}
