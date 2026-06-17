import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CalendarDays, MapPin, Sparkles, Users } from 'lucide-react';

import { CcwRoadshowBooking } from '@/components/marketing/CcwRoadshowBooking';
import { MarketingSectionHeader } from '@/components/marketing/MarketingSectionHeader';
import { BreadcrumbSchema, EventSchema, FAQSchema, ItemListSchema } from '@/components/seo';
import { getPublicSiteUrl } from '@/lib/env/public-url';
import {
  marketingBody,
  marketingBodySm,
  marketingBtnSecondary,
  marketingEyebrowEmerald,
  marketingEyebrowPill,
  marketingHeading,
  marketingPageGlow,
  marketingPanel,
  marketingPanelHover,
  marketingSection,
  marketingStatCard,
  marketingTopicPill,
} from '@/lib/marketing/marketing-ui';
import {
  ccwRoadshowCampaignPillars,
  ccwRoadshowEvents,
  ccwRoadshowPath,
  ccwRoadshowTicketPackages,
  ccwRoadshowTitle,
  ccwRoadshowTopics,
  formatAudFromCents,
} from '@/lib/marketing/ccw-roadshow';

const siteUrl = getPublicSiteUrl();
const canonical = `${siteUrl}${ccwRoadshowPath}`;

export const metadata: Metadata = {
  title: 'CARSI x CCW Business Growth Days | Melbourne and Sydney 2026',
  description:
    'Book CARSI x CCW Business Growth Days in Melbourne 22-23 July 2026 or Sydney 30-31 July 2026. Carpet cleaning, rug cleaning, stain removal, tile cleaning and business growth.',
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
    title: 'CARSI x CCW Business Growth Days',
    description:
      'Two practical days at CCW Melbourne and Sydney for carpet, rug, stain and tile cleaning operators.',
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
      'Bookings are $175 per person or $500 for a team pack of five seats. Payment is taken through Stripe Checkout.',
  },
  {
    question: 'Where are the Melbourne and Sydney events held?',
    answer:
      'Melbourne is held at Carpet Cleaners Warehouse, Unit 1/5 Gatwick Road, Bayswater North VIC 3153. Sydney is held at Carpet Cleaners Warehouse, 2/8 Tollis Place, Seven Hills NSW 2147.',
  },
  {
    question: 'What topics are covered?',
    answer:
      'The program connects carpet cleaning, rug cleaning, stain removal, tile cleaning, professional equipment, chemistry, service design, quoting confidence and CARSI/CCW business growth.',
  },
];

export default function CcwRoadshowPage() {
  return (
    <>
      <BreadcrumbSchema items={breadcrumbs} />
      <FAQSchema questions={faqs} />
      <ItemListSchema
        name="CARSI x CCW Business Growth Days event dates"
        description="Melbourne and Sydney CARSI x CCW roadshow events for carpet, rug, stain, tile and business growth training."
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
          isFree={false}
          image={`${siteUrl}/og-image.png`}
          eventType="BusinessEvent"
        />
      ))}

      <main className="relative min-h-screen pb-16 pt-6 text-white sm:pb-20 sm:pt-8">
        <div className={marketingPageGlow} aria-hidden="true" />

        {/* Hero */}
        <section className="relative z-10 pb-12 sm:pb-14">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(300px,420px)] lg:items-start lg:gap-12">
            <div className="min-w-0">
              <span
                className={`inline-flex items-center gap-2 rounded-full border border-[#34d399]/25 bg-[#34d399]/10 px-3 py-1 text-xs font-medium text-[#34d399]`}
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#34d399] opacity-40" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#34d399]" />
                </span>
                Melbourne + Sydney · July 2026
              </span>

              <p className={`mt-5 ${marketingEyebrowEmerald}`}>
                CARSI and Carpet Cleaners Warehouse
              </p>

              <h1 className={`mt-3 ${marketingHeading}`}>{ccwRoadshowTitle}</h1>

              <p className={`mt-5 max-w-xl ${marketingBody}`}>
                Two practical days at CCW locations for carpet cleaning, rug cleaning, stain
                removal, tile cleaning and business growth. Build the bridge between training,
                equipment, chemicals, service confidence and better customer conversations.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className={marketingStatCard}>
                  <CalendarDays className="mb-3 h-4 w-4 text-[#2490ed]/80" aria-hidden />
                  <p className="text-sm font-semibold text-white/90">July 2026</p>
                  <p className={`mt-1 ${marketingBodySm}`}>Melbourne 22-23, Sydney 30-31</p>
                </div>
                <div className={marketingStatCard}>
                  <Users className="mb-3 h-4 w-4 text-[#2490ed]/80" aria-hidden />
                  <p className="text-sm font-semibold text-white/90">Seats paid online</p>
                  <p className={`mt-1 ${marketingBodySm}`}>$175 each or $500 for 5</p>
                </div>
                <div className={marketingStatCard}>
                  <Sparkles className="mb-3 h-4 w-4 text-[#2490ed]/80" aria-hidden />
                  <p className="text-sm font-semibold text-white/90">Course material included</p>
                  <p className={`mt-1 ${marketingBodySm}`}>
                    Course outline and practical chemical details
                  </p>
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
              Both events run from 8.30am to 4.30pm on both days. Books are essential.
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
                    <h3 className="mt-2 text-xl font-bold tracking-tight text-white sm:text-2xl">
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
                    <p className="text-sm font-semibold text-white/85">{event.venueName}</p>
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
            title="A growth day built around practical decisions"
            body="The campaign pulls beginners, existing cleaners, growing teams and business buyers into one useful conversation: why the day matters, who should be in the room and what they should be able to do after it."
          />

          <div className="grid gap-4 lg:grid-cols-3">
            {Object.values(ccwRoadshowCampaignPillars).map((pillar) => (
              <article key={pillar.eyebrow} className={`p-5 ${marketingPanel}`}>
                <p className="text-[10px] font-semibold tracking-[0.14em] text-[#2490ed]/80 uppercase">
                  {pillar.eyebrow}
                </p>
                <h3 className="mt-3 text-lg font-bold leading-snug text-white">{pillar.title}</h3>
                <p className={`mt-3 ${marketingBodySm}`}>{pillar.body}</p>
                <div className="mt-5 space-y-3">
                  {pillar.points.map((point) => (
                    <div key={point} className="flex gap-3">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2490ed]" />
                      <p className={`${marketingBodySm} text-white/50`}>{point}</p>
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
                eyebrow="Daily Focus"
                title="Built around outcomes you can use in the business"
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
              <p className={marketingEyebrowPill}>Pricing</p>
              <div className="mt-5 space-y-3">
                {ccwRoadshowTicketPackages.map((pkg) => (
                  <div key={pkg.id} className={`p-4 ${marketingPanel}`}>
                    <p className="text-sm font-semibold text-white/90">{pkg.label}</p>
                    <p className="mt-1 text-2xl font-bold tracking-tight text-white">
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
                Book through Stripe <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
