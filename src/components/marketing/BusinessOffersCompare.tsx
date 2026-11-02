import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import type { BusinessOffer, BusinessOfferId } from '@/lib/marketing/business-offers';
import { marketingPanel, marketingTextMuted, marketingTextStrong } from '@/lib/marketing/marketing-ui';

/**
 * "Which one is right for you?" — the three CARSI business offers side by side, shown on each of
 * their sales pages so a buyer can tell the monthly subscription from the one-off event seat and the
 * per-seat meetup. Presentational only: offers come from `getBusinessOffers()`, which reads every
 * price from the same constants and event data the checkouts use.
 */
export function BusinessOffersCompare({
  offers,
  currentId,
  className = '',
}: {
  offers: BusinessOffer[];
  currentId: BusinessOfferId;
  className?: string;
}) {
  return (
    <section aria-labelledby="business-offers-compare-heading" className={className}>
      <h2
        id="business-offers-compare-heading"
        className={`text-xl font-semibold tracking-tight ${marketingTextStrong}`}
      >
        Which one is right for you?
      </h2>
      <p className={`mt-2 max-w-2xl text-sm leading-relaxed ${marketingTextMuted}`}>
        CARSI runs three separate business programs. Compare what each costs and how often you pay
        before you book.
      </p>
      <ul className="mt-6 grid gap-4 md:grid-cols-3">
        {offers.map((offer) => {
          const isCurrent = offer.id === currentId;
          return (
            <li
              key={offer.id}
              aria-current={isCurrent ? 'page' : undefined}
              className={`flex flex-col p-5 ${marketingPanel} ${
                isCurrent ? 'ring-2 ring-[#2490ed]/60' : ''
              }`}
            >
              {isCurrent ? (
                <p className="text-[11px] font-semibold tracking-wide text-[#146fc2] uppercase">
                  You are here
                </p>
              ) : null}
              <h3 className={`mt-1 text-base font-semibold ${marketingTextStrong}`}>{offer.name}</h3>
              <p className={`mt-3 text-lg font-bold ${marketingTextStrong}`}>{offer.priceLabel}</p>
              <p className="mt-1 text-sm font-medium text-[#a85500]">{offer.cadence}</p>
              <dl className={`mt-4 space-y-2 text-sm leading-relaxed ${marketingTextMuted}`}>
                <div>
                  <dt className="sr-only">Format</dt>
                  <dd>{offer.format}</dd>
                </div>
                <div>
                  <dt className={`font-medium ${marketingTextStrong}`}>Best for</dt>
                  <dd>{offer.bestFor}</dd>
                </div>
              </dl>
              {isCurrent ? null : (
                <Link
                  href={offer.href}
                  className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#146fc2] hover:underline"
                >
                  See {offer.name}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
