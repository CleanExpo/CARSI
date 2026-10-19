import type { Metadata } from 'next';

import { getPublicSiteUrl } from '@/lib/env/public-url';

import { CcwRoadshowContent } from '@/components/marketing/CcwRoadshowPage';
import {
  getCcwNextDatesDescription,
  getCcwRoadshowEvent,
  hasCcwRoadshowSessionEnded,
} from '@/lib/marketing/ccw-roadshow';

const siteUrl = getPublicSiteUrl();

// Derived, not restated - same drift class as the Sydney and Brisbane vanity pages.
const melbourne = getCcwRoadshowEvent('melbourne');

// Event JSON-LD is emitted only for sessions still to come, so re-render hourly; a static
// build would otherwise keep a finished session marked EventScheduled until the next deploy.
export const revalidate = 3600;

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
    description: `Free for CCW past and current customers. Two practical business-growth days with Phill McGurk at ${melbourne.venueName} (${melbourne.suburb}), ${melbourneDates}. Claim your free entry token.`,
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
