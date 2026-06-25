import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CalendarDays, MapPin, Sparkles, Users } from 'lucide-react';

import { CcwRoadshowBooking } from '@/components/marketing/CcwRoadshowBooking';
import { MarketingGrowthLinks } from '@/components/marketing/MarketingGrowthLinks';
import { MarketingSectionHeader } from '@/components/marketing/MarketingSectionHeader';
import {
  MarketingPageShell,
} from '@/components/marketing/MarketingPageShell';
import { BreadcrumbSchema, EventSchema, FAQSchema, ItemListSchema } from '@/components/seo';
import { getPublicSiteUrl } from '@/lib/env/public-url';
import {
  marketingBody,
  marketingBodySm,
  marketingBtnSecondary,
  marketingEyebrowAmber,
  marketingEyebrowPill,
  marketingHeading,
  marketingPanel,
  marketingPanelHover,
  marketingSection,
  marketingStatCard,
  marketingTopicPill,
} from '@/lib/marketing/marketing-ui';
import {
  ccwRoadshowCampaignPillars,
  ccwRoadshowEvents,
  ccwRoadshowFacilityAdvantages,
  ccwRoadshowFreeEntryOffer,
  ccwRoadshowHeroHeadline,
  ccwRoadshowPath,
  ccwRoadshowPresenter,
  ccwRoadshowTicketPackages,
  ccwRoadshowTitle,
  ccwRoadshowTopics,
  formatAudFromCents,
} from '@/lib/marketing/ccw-roadshow';

const siteUrl = getPublicSiteUrl();
const canonical = `${siteUrl}${ccwRoadshowPath}`;

export const metadata: Metadata = {
  title: 'Grow Your Cleaning Business | CARSI x CCW Roadshow 2026',
  description:
    'Free for CCW past and current customers. Spend two practical days with Phill McGurk at CCW Melbourne or Sydney and claim a free entry token when you register.',
  alternates: { canonical },
  keywords: [
    'carpet cleaning training Melbourne',
    'carpet cleaning training Sydney',
    'rug cleaning training Australia',
    'stain removal training',
    'tile cleaning training',
    'carpet cleaning business growth',
    'CARSI CCW training',
  ],
  openGraph: {
    title: 'Grow Your Cleaning Business with CARSI x CCW',
    description:
      'Two practical business-growth days with Phill McGurk inside CCW Melbourne and Sydney locations.',
    url: canonical,
    type: 'website',
    images: ['/og-image.png'],
  },
};

const breadcrumbs = [
  { name: 'Home', url: siteUrl },
  { name: 'Events', url: `${siteUrl}${ccwRoadshowPath}` },
  { name: ccwRoadshowTitle, url: canonical },
];

const faqs = [
  {
    question: 'Who should attend the CARSI x CCW Business Growth Days?',
    answer:
      'The days suit carpet cleaning operators, rug and stain removal technicians, tile cleaning teams, cleaners adding carpet cleaning, and owners looking for practical business growth support.',
  },
  {
    question: 'How much does it cost?',
    answer:
      'All CCW past and current customers can attend free. Register on the CARSI event page to claim a free entry token for check-in.',
  },
  {
    question: 'Where are the Melbourne and Sydney events held?',
    answer:
      'Melbourne is held at Carpet Cleaners Warehouse, Unit 1/5 Gatwick Road, Bayswater North VIC 3153. Sydney is held at Carpet Cleaners Warehouse, 2/8 Tollis Place, Seven Hills NSW 2147.',
  },
  {
    question: 'What topics are covered?',
    answer:
      'The program connects carpet cleaning, rug cleaning, stain removal, tile cleaning, professional equipment, chemistry, service design, quoting confidence, profitable service growth and practical CCW facility demonstrations.',
  },
];

export default function CcwRoadshowPage() {
  return (
    <>
      <BreadcrumbSchema items={breadcrumbs} />
      <FAQSchema questions={faqs} />
      <ItemListSchema
        name="CARSI x CCW Business Growth Days event dates"
        description="Melbourne and Sydney CARSI x CCW roadshow events for cleaners who want better jobs, stronger quoting confidence and practical business growth."
        items={ccwRoadshowEvents.map((event) => ({
          name: event.title,
          description: event.description,
          url: `${canonical}?event=${event.slug}`,
        }))}
      />
      {ccwRoadshowEvents.map((event) => (
        <EventSchema
          key={event.slug}
          name={event.title}
          description={event.description}
          startDate={event.startDateIso}
          endDate={event.endDateIso}
          url={`${canonical}?event=${event.slug}`}
          locationName={event.venueName}
          locationAddress={event.streetAddress}
          locationCity={event.suburb}
          locationState={event.state}
          organiserName="CARSI and Carpet Cleaners Warehouse"
          organiserUrl="https://www.carsi.com.au"
          ticketUrl={canonical}
          isFree
          image={`${siteUrl}/og-image.png`}
          eventType="BusinessEvent"
        />
      ))}

      <MarketingPageShell
        id="main-content"
        innerClassName="relative z-10 mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16"
      >

        {/* Hero */}
        <section className="relative z-10 pb-12 sm:pb-14">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(300px,420px)] lg:items-start lg:gap-12">
            <div className="min-w-0">
              <span
                className={`inline-flex items-center gap-2 rounded-full border border-[#ed9d24]/25 bg-[#ed9d24]/10 px-3 py-1 text-xs font-medium text-[#ed9d24]`}
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ed9d24] opacity-40" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#ed9d24]" />
                </span>
                Melbourne + Sydney · July 2026
              </span>

              <p className={`mt-5 ${marketingEyebrowAmber}`}>
                CARSI and Carpet Cleaners Warehouse
              </p>

              <h1 className={`mt-3 ${marketingHeading}`}>{ccwRoadshowHeroHeadline}</h1>

              <p className="mt-3 text-lg font-semibold text-[#ed9d24]">
                Spend two days with {ccwRoadshowPresenter.name}
              </p>

              <p className={`mt-5 max-w-xl ${marketingBody}`}>
                Practical business-growth training inside Carpet Cleaners Warehouse locations.
                Build the bridge between training, equipment, chemicals, quoting confidence,
                customer conversations and services that can grow profitably.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className={marketingStatCard}>
                  <CalendarDays className="mb-3 h-4 w-4 text-[#2490ed]/80" aria-hidden />
                  <p className="text-sm font-semibold text-slate-900 dark:text-white/90">July 2026</p>
                  <p className={`mt-1 ${marketingBodySm}`}>Melbourne 22-23, Sydney 30-31</p>
                </div>
                <div className={marketingStatCard}>
                  <Users className="mb-3 h-4 w-4 text-[#ed9d24]/80" aria-hidden />
                  <p className="text-sm font-semibold text-slate-900 dark:text-white/90">Free CCW entry</p>
                  <p className={`mt-1 ${marketingBodySm}`}>Past/current customers claim a token</p>
                </div>
                <div className={marketingStatCard}>
                  <Sparkles className="mb-3 h-4 w-4 text-[#2490ed]/80" aria-hidden />
                  <p className="text-sm font-semibold text-slate-900 dark:text-white/90">Limited seats</p>
                  <p className={`mt-1 ${marketingBodySm}`}>Small group format. Register early.</p>
                </div>
              </div>

              <div className="mt-7 flex flex-wrap gap-2">
                {ccwRoadshowTopics.map((topic) => (
                  <span key={topic} className={marketingTopicPill}>
                    {topic}
                  </span>
                ))}
              </div>

              <div className="mt-8 hidden lg:block">
                <Link href="#program" className={marketingBtnSecondary}>
                  View full program <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div id="booking" className="lg:sticky lg:top-24">
              <CcwRoadshowBooking events={ccwRoadshowEvents} />
            </div>
          </div>
        </section>

        {/* Event dates */}
        <section className={`relative z-10 ${marketingSection}`}>
          <div className="mb-8 flex flex-col justify-between gap-4 sm:mb-10 sm:flex-row sm:items-end">
            <MarketingSectionHeader
              eyebrow="Event Dates"
              title="Choose your CCW location"
              className="mb-0 md:mb-0"
            />
            <p className={`max-w-md ${marketingBodySm} sm:text-right`}>
              Both events run from 8.30am to 4.30pm on both days. Attendance numbers are limited so
              the room stays practical.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {ccwRoadshowEvents.map((event) => (
              <article key={event.slug} className={`p-5 ${marketingPanel} ${marketingPanelHover}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold tracking-[0.14em] text-[#7ec5ff] uppercase">
                      {event.city}
                    </p>
                    <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                      {event.dates}
                    </h3>
                    <p className={`mt-2 ${marketingBodySm}`}>{event.timeLabel}</p>
                  </div>
                  <span className="rounded-full border border-[#2490ed]/25 bg-[#2490ed]/10 px-3 py-1 text-[10px] font-semibold tracking-wide text-[#7ec5ff] uppercase">
                    2 days
                  </span>
                </div>

                <div className="mt-5 flex gap-3 border-t border-white/[0.06] pt-5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#2490ed]/70" aria-hidden />
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-white/85">{event.venueName}</p>
                    <p className={`mt-1 ${marketingBodySm}`}>
                      {event.streetAddress}, {event.suburbStatePostcode}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Program pillars */}
        <section
          id="program"
          className={`relative z-10 ${marketingSection} bg-white/[0.015]`}
        >
          <MarketingSectionHeader
            eyebrow="Why, Who, What"
            title="Business improvement, not just a chemical day"
            body="The value is not only the topic list. The value is spending two days with Phill, CARSI and the CCW team connecting services, equipment, chemicals and real customer decisions into a plan you can use."
          />

          <div className="grid gap-4 lg:grid-cols-3">
            {Object.values(ccwRoadshowCampaignPillars).map((pillar) => (
              <article key={pillar.eyebrow} className={`p-5 ${marketingPanel}`}>
                <p className="text-[10px] font-semibold tracking-[0.14em] text-[#2490ed]/80 uppercase">
                  {pillar.eyebrow}
                </p>
                <h3 className="mt-3 text-lg font-bold leading-snug text-slate-900 dark:text-white">{pillar.title}</h3>
                <p className={`mt-3 ${marketingBodySm}`}>{pillar.body}</p>
                <div className="mt-5 space-y-3">
                  {pillar.points.map((point) => (
                    <div key={point} className="flex gap-3">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2490ed]" />
                      <p className={marketingBodySm}>{point}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Daily focus + pricing */}
        <section className={`relative z-10 ${marketingSection}`}>
          <div className="grid gap-8 lg:grid-cols-[1fr_0.85fr] lg:gap-10">
            <div>
              <MarketingSectionHeader
                eyebrow="Walk Away With"
                title="Strategies you can use immediately"
                className="mb-6 md:mb-8"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                {ccwRoadshowCampaignPillars.achieve.points.map((item) => (
                  <div key={item} className={`p-4 ${marketingPanel}`}>
                    <p className={marketingBodySm}>{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className={`p-5 ${marketingStatCard}`}>
              <p className={marketingEyebrowPill}>Free CCW customer entry</p>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {ccwRoadshowFreeEntryOffer.headline}
              </h2>
              <p className={`mt-3 ${marketingBodySm}`}>{ccwRoadshowFreeEntryOffer.detail}</p>
              <div className="mt-5 space-y-3">
                {ccwRoadshowTicketPackages.map((pkg) => (
                  <div key={pkg.id} className={`p-4 ${marketingPanel}`}>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white/90">{pkg.label}</p>
                    <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                      {formatAudFromCents(pkg.unitAmountCents)}
                    </p>
                    <p className={`mt-1 ${marketingBodySm}`}>{pkg.description}</p>
                  </div>
                ))}
              </div>
              <Link
                href="#booking"
                className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#2490ed]/35 bg-[#2490ed]/10 px-5 py-2.5 text-sm font-semibold text-[#7ec5ff] transition-all hover:border-[#2490ed]/50 hover:bg-[#2490ed]/18"
              >
                Claim your free entry token <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </section>

        <section className={`relative z-10 ${marketingSection}`}>
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-10">
            <div>
              <MarketingSectionHeader
                eyebrow="Why CCW Facilities Matter"
                title="Practical training inside Carpet Cleaners Warehouse"
                body={`This is not a hotel-room lecture. The Melbourne and Sydney days happen inside CCW locations, so the training can connect directly to equipment, chemical choices, service offers and the questions cleaners ask before they buy or quote. ${ccwRoadshowPresenter.value}`}
                className="mb-0 md:mb-0"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {ccwRoadshowFacilityAdvantages.map((item) => (
                <div key={item} className={`p-4 ${marketingPanel}`}>
                  <p className={marketingBodySm}>{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <MarketingGrowthLinks currentHref={ccwRoadshowPath} />
      </MarketingPageShell>
    </>
  );
}
