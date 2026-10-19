import type { Metadata } from 'next';

import { CcwRoadshowContent } from '@/components/marketing/CcwRoadshowPage';
import { getPublicSiteUrl } from '@/lib/env/public-url';
import {
  ccwRoadshowPath,
  getCcwRoadshowEvent,
  getCcwRoadshowPricing,
} from '@/lib/marketing/ccw-roadshow';

const siteUrl = getPublicSiteUrl();
const canonical = `${siteUrl}${ccwRoadshowPath}`;

// Rendered per request, explicitly: the shared content emits Event JSON-LD and dates that turn
// on whether a sitting has ended. Awaiting searchParams already makes this route dynamic, but
// that is incidental - dropping it must not silently make the hub static.
export const dynamic = 'force-dynamic';

/** The free-entry line appears only while a free-token sitting is still ahead. */
function pricingLine(now: Date): string {
  const pricing = getCcwRoadshowPricing(now);
  if (pricing.mode === 'free') {
    return `Entry to the ${pricing.freeCities.join(' and ')} sitting is free for past and current CCW customers; other seats are booked through Carpet Cleaners Warehouse.`;
  }
  if (pricing.mode === 'paid') return 'Seats for the upcoming sittings are booked through Carpet Cleaners Warehouse.';
  return 'Pricing is confirmed with each new date.';
}

const baseMetadata: Metadata = {
  title: 'Grow Your Cleaning Business | CARSI x CCW Roadshow 2026',
  alternates: { canonical },
  keywords: [
    'carpet cleaning training Melbourne',
    'carpet cleaning training Sydney',
    'carpet cleaning training Brisbane',
    'rug cleaning training Australia',
    'stain removal training',
    'tile cleaning training',
    'carpet cleaning business growth',
    'CARSI CCW training',
  ],
  openGraph: {
    title: 'Grow Your Cleaning Business with CARSI x CCW',
    description:
      'Two practical business-growth days with Phill McGurk inside CCW Melbourne, Sydney and Brisbane locations.',
    url: canonical,
    type: 'website',
    images: ['/og-image.png'],
  },
};

export function generateMetadata(): Metadata {
  return {
    ...baseMetadata,
    description: `Spend two practical days with Phill McGurk at CCW Melbourne, Sydney or Brisbane. ${pricingLine(new Date())}`,
  };
}

export { CcwRoadshowContent };

export default async function CcwRoadshowPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string | string[] }>;
}) {
  const query = await searchParams;
  const event = typeof query.event === 'string' ? getCcwRoadshowEvent(query.event) : null;
  return <CcwRoadshowContent focusSlug={event?.slug} />;
}
