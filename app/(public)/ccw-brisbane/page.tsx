import type { Metadata } from 'next';

import { getPublicSiteUrl } from '@/lib/env/public-url';

import { CcwRoadshowContent } from '../events/ccw-roadshow/page';
import {
  formatAudFromCents,
  getCcwNextDatesDescription,
  getCcwRoadshowEvent,
  hasCcwRoadshowSessionEnded,
} from '@/lib/marketing/ccw-roadshow';

const siteUrl = getPublicSiteUrl();

// Derived from the roadshow data module rather than restated. These strings were
// hardcoded and went stale by a month while the data module was the thing being
// corrected — the drift GP-545 was raised for. Reading the event makes that
// impossible to repeat.
const brisbane = getCcwRoadshowEvent('brisbane-2026-10-09');

// Rendered per request: the Event JSON-LD, dates, venue and metadata all turn on whether a
// sitting has ended, so no cached copy may outlive a session boundary.
export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
  const page = {
    alternates: { canonical: `${siteUrl}/ccw-brisbane` },
    openGraph: { url: `${siteUrl}/ccw-brisbane`, type: 'website' as const, images: ['/og-image.png'] },
  };
  // A sitting that has ended is never advertised: no past dates or price, next dates TBA.
  if (!brisbane || hasCcwRoadshowSessionEnded(brisbane, new Date())) {
    const description = getCcwNextDatesDescription('Brisbane');
    return {
      ...page,
      title: 'CARSI x CCW Brisbane | Carpet and Upholstery Training - Next dates to be announced',
      description,
      openGraph: { ...page.openGraph, title: 'CARSI x CCW Brisbane - Carpet and Upholstery Training', description },
    };
  }
  const brisbaneDates = brisbane.dates;
  const brisbanePrice = brisbane.unitAmountCents !== undefined
    ? `${formatAudFromCents(brisbane.unitAmountCents)} including GST; `
    : '';
  return {
    ...page,
    title: `CARSI x CCW Brisbane | Carpet and Upholstery Training - ${brisbaneDates}`,
    description:
      `Carpet and upholstery training with Phill McGurk at Carpet Cleaners Warehouse Boondall, ${brisbaneDates}. ${brisbanePrice}book through CCW.`,
    openGraph: {
      ...page.openGraph,
      title: 'CARSI x CCW Brisbane - Carpet and Upholstery Training',
      description: `Two practical training days with Phill McGurk at Carpet Cleaners Warehouse Boondall, ${brisbaneDates}.`,
    },
  };
}

export default function CcwBrisbanePage() {
  return <CcwRoadshowContent focusSlug="brisbane-2026-10-09" />;
}
