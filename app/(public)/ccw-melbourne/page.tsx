import type { Metadata } from 'next';

import { getPublicSiteUrl } from '@/lib/env/public-url';

import { CcwRoadshowContent } from '@/components/marketing/CcwRoadshowPage';
import {
  allowsFreeEntryRegistration,
  getCcwNextDatesDescription,
  getCcwRoadshowEvent,
  hasCcwRoadshowSessionEnded,
} from '@/lib/marketing/ccw-roadshow';

const siteUrl = getPublicSiteUrl();

// Derived, not restated - same drift class as the Sydney and Brisbane vanity pages.
const melbourne = getCcwRoadshowEvent('melbourne');

// Rendered per request: the Event JSON-LD, dates, venue and metadata all turn on whether a
// sitting has ended, so no cached copy may outlive a session boundary.
export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
  const page = {
    alternates: { canonical: `${siteUrl}/ccw-melbourne` },
    openGraph: { url: `${siteUrl}/ccw-melbourne`, type: 'website' as const, images: ['/og-image.png'] },
  };
  // A sitting that has ended is never advertised: announce the next dates at the CCW store.
  if (!melbourne || hasCcwRoadshowSessionEnded(melbourne, new Date())) {
    const description = getCcwNextDatesDescription('Melbourne');
    return {
      ...page,
      title: 'CARSI x CCW Melbourne | Grow Your Cleaning Business — Next dates to be announced',
      description,
      openGraph: { ...page.openGraph, title: 'CARSI x CCW Melbourne — Grow Your Cleaning Business', description },
    };
  }
  const melbourneDates = melbourne.dates;
  return {
    ...page,
    title: `CARSI x CCW Melbourne | Grow Your Cleaning Business — ${melbourneDates}`,
    description: allowsFreeEntryRegistration(melbourne)
      ? `Free for CCW past and current customers. Two practical business-growth days with Phill McGurk at ${melbourne.venueName} (${melbourne.suburb}), ${melbourneDates}. Claim your free entry token.`
      : `Two practical business-growth days with Phill McGurk at ${melbourne.venueName} (${melbourne.suburb}), ${melbourneDates}. Seats are booked through Carpet Cleaners Warehouse.`,
    openGraph: {
      ...page.openGraph,
      title: 'CARSI x CCW Melbourne — Grow Your Cleaning Business',
      description: `Two practical business-growth days with Phill McGurk at ${melbourne.venueName}, ${melbourneDates}.`,
    },
  };
}

export default function CcwMelbournePage() {
  return <CcwRoadshowContent focusSlug="melbourne" />;
}
