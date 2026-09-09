import type { Metadata } from 'next';

import { getPublicSiteUrl } from '@/lib/env/public-url';

import { CcwRoadshowContent } from '../events/ccw-roadshow/page';
import { getCcwRoadshowEvent } from '@/lib/marketing/ccw-roadshow';

const siteUrl = getPublicSiteUrl();

// Derived, not restated. This page hardcoded "30-31 July 2026" and free-entry copy,
// and was missed by the first pass of this fix because a grep for August dates could
// never match a July one. Reading the event removes the whole class.
const sydneyDates = getCcwRoadshowEvent('sydney')?.dates ?? '';

export const metadata: Metadata = {
  title: `CARSI x CCW Sydney | Grow Your Cleaning Business — ${sydneyDates}`,
  description: `Two practical business-growth days with Phill McGurk at Carpet Cleaners Warehouse Sydney (Seven Hills), ${sydneyDates}. Seats are booked through Carpet Cleaners Warehouse.`,
  alternates: { canonical: `${siteUrl}/ccw-sydney` },
  openGraph: {
    title: 'CARSI x CCW Sydney — Grow Your Cleaning Business',
    description: `Two practical business-growth days with Phill McGurk inside Carpet Cleaners Warehouse Sydney, ${sydneyDates}.`,
    url: `${siteUrl}/ccw-sydney`,
    type: 'website',
    images: ['/og-image.png'],
  },
};

export default function CcwSydneyPage() {
  return <CcwRoadshowContent focusSlug="sydney" />;
}
