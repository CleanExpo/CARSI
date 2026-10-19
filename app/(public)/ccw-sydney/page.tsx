import type { Metadata } from 'next';

import { getPublicSiteUrl } from '@/lib/env/public-url';

import { CcwRoadshowContent } from '@/components/marketing/CcwRoadshowPage';
import {
  getCcwNextDatesDescription,
  getCcwRoadshowEvent,
  hasCcwRoadshowSessionEnded,
} from '@/lib/marketing/ccw-roadshow';

const siteUrl = getPublicSiteUrl();

// Derived, not restated. This page hardcoded "30-31 July 2026" and free-entry copy,
// and was missed by the first pass of this fix because a grep for August dates could
// never match a July one. Reading the event removes the whole class.
const sydney = getCcwRoadshowEvent('sydney');

// Rendered per request: the Event JSON-LD, dates, venue and metadata all turn on whether a
// sitting has ended, so no cached copy may outlive a session boundary.
export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
  const page = {
    alternates: { canonical: `${siteUrl}/ccw-sydney` },
    openGraph: { url: `${siteUrl}/ccw-sydney`, type: 'website' as const, images: ['/og-image.png'] },
  };
  // A sitting that has ended is never advertised: announce the next dates at the CCW store.
  if (!sydney || hasCcwRoadshowSessionEnded(sydney, new Date())) {
    const description = getCcwNextDatesDescription('Sydney');
    return {
      ...page,
      title: 'CARSI x CCW Sydney | Grow Your Cleaning Business — Next dates to be announced',
      description,
      openGraph: { ...page.openGraph, title: 'CARSI x CCW Sydney — Grow Your Cleaning Business', description },
    };
  }
  const sydneyDates = sydney.dates;
  return {
    ...page,
    title: `CARSI x CCW Sydney | Grow Your Cleaning Business — ${sydneyDates}`,
    description: `Two practical business-growth days with Phill McGurk at Carpet Cleaners Warehouse Sydney (Seven Hills), ${sydneyDates}. Seats are booked through Carpet Cleaners Warehouse.`,
    openGraph: {
      ...page.openGraph,
      title: 'CARSI x CCW Sydney — Grow Your Cleaning Business',
      description: `Two practical business-growth days with Phill McGurk inside Carpet Cleaners Warehouse Sydney, ${sydneyDates}.`,
    },
  };
}

export default function CcwSydneyPage() {
  return <CcwRoadshowContent focusSlug="sydney" />;
}
