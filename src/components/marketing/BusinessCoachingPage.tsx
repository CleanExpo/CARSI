import { Suspense } from 'react';

import { BusinessCoachingBooking } from '@/components/marketing/BusinessCoachingBooking';
import { BusinessOffersCompare } from '@/components/marketing/BusinessOffersCompare';
import { MarketingPageShell } from '@/components/marketing/MarketingPageShell';
import {
  businessCoachingProductName,
  businessCoachingSeatPriceCents,
  businessCoachingTagline,
  formatAudFromCents,
  listBookableBusinessCoachingSessions,
} from '@/lib/marketing/business-coaching';
import { getBusinessOffers } from '@/lib/marketing/business-offers';
import {
  marketingEyebrowPill,
  marketingPanel,
  marketingTextMuted,
  marketingTextStrong,
} from '@/lib/marketing/marketing-ui';
import { isBusinessCoachingEnabled } from '@/lib/server/business-coaching-flag';

const pillars = [
  {
    title: 'Built for tight budgets',
    body: `Seats are ${formatAudFromCents(businessCoachingSeatPriceCents)} — designed for owner-operators, not corporate training budgets.`,
  },
  {
    title: 'Face-to-face, but limited',
    body: 'One after-hours group session each month. Real conversation, shared stories, and practical business development with Phill McGurk.',
  },
  {
    title: 'Bring your partner',
    body: 'Book two seats when your spouse or business partner should hear the same discussion — still $22 per person.',
  },
  {
    title: 'AI support (coming)',
    body: 'CARSI is building AI guides for day-to-day questions between sessions. Owner Circle stays human for the room conversation.',
  },
];

export function BusinessCoachingContent() {
  const sessions = listBookableBusinessCoachingSessions();
  const checkoutEnabled = isBusinessCoachingEnabled();

  return (
    <MarketingPageShell className="py-12 sm:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <p className={marketingEyebrowPill}>Small business · Cleaning & restoration</p>
        <h1 className={`mt-4 text-3xl font-bold tracking-tight sm:text-4xl ${marketingTextStrong}`}>
          {businessCoachingProductName}
        </h1>
        <p className={`mt-3 max-w-2xl text-base leading-relaxed ${marketingTextMuted}`}>
          {businessCoachingTagline}
        </p>

        <BusinessOffersCompare
          offers={getBusinessOffers()}
          currentId="owner-circle"
          className="mt-8"
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            {pillars.map((p) => (
              <div key={p.title} className={`p-5 ${marketingPanel}`}>
                <h2 className={`text-base font-semibold ${marketingTextStrong}`}>{p.title}</h2>
                <p className={`mt-2 text-sm leading-relaxed ${marketingTextMuted}`}>{p.body}</p>
              </div>
            ))}
            <div className={`p-5 ${marketingPanel}`}>
              <h2 className={`text-base font-semibold ${marketingTextStrong}`}>
                High-ticket add-ons
              </h2>
              <p className={`mt-2 text-sm leading-relaxed ${marketingTextMuted}`}>
                Intensive 1:1 or equipment-heavy programs are offered separately when they fit — not
                bundled into every seat. Owner Circle is the affordable entry point.
              </p>
            </div>
          </div>

          <Suspense fallback={<p className={marketingTextMuted}>Loading booking form…</p>}>
            <BusinessCoachingBooking sessions={sessions} checkoutEnabled={checkoutEnabled} />
          </Suspense>
        </div>
      </div>
    </MarketingPageShell>
  );
}
