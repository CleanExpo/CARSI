import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CalendarDays, MapPin, Sparkles, Users } from 'lucide-react';

import { CcwRoadshowBooking } from '@/components/marketing/CcwRoadshowBooking';
import { BreadcrumbSchema, EventSchema, FAQSchema, ItemListSchema } from '@/components/seo';
import { getPublicSiteUrl } from '@/lib/env/public-url';
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
          organiserUrl="https://carsi.com.au"
          ticketUrl={canonical}
          isFree={false}
          image={`${siteUrl}/og-image.png`}
          eventType="BusinessEvent"
        />
      ))}

      <main className="min-h-screen bg-[#050505] text-white">
        <section className="border-b border-white/8 px-4 pt-14 pb-12 md:pt-18">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
            <div>
              <div className="mb-6 flex items-center gap-3">
                <Image
                  src="/logo.png"
                  alt="CARSI"
                  width={56}
                  height={56}
                  className="h-14 w-14 rounded-lg border border-white/10 bg-white object-contain p-1"
                  priority
                />
                <div>
                  <p className="text-xs font-semibold tracking-[0.2em] text-[#34d399] uppercase">
                    Melbourne + Sydney
                  </p>
                  <p className="text-sm text-white/50">CARSI and Carpet Cleaners Warehouse</p>
                </div>
              </div>

              <h1 className="max-w-4xl text-4xl leading-tight font-bold tracking-tight text-white md:text-6xl">
                {ccwRoadshowTitle}
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-relaxed text-white/62">
                Two practical days at CCW locations for carpet cleaning, rug cleaning, stain
                removal, tile cleaning and business growth. Build the bridge between training,
                equipment, chemicals, service confidence and better customer conversations.
              </p>

              <div className="mt-7 grid max-w-4xl gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                  <CalendarDays className="mb-3 h-5 w-5 text-[#2490ed]" aria-hidden />
                  <p className="text-sm font-semibold text-white">July 2026</p>
                  <p className="mt-1 text-sm text-white/52">Melbourne 22-23, Sydney 30-31</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                  <Users className="mb-3 h-5 w-5 text-[#34d399]" aria-hidden />
                  <p className="text-sm font-semibold text-white">Seats paid online</p>
                  <p className="mt-1 text-sm text-white/52">$175 each or $500 for 5</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                  <Sparkles className="mb-3 h-5 w-5 text-[#fbbf24]" aria-hidden />
                  <p className="text-sm font-semibold text-white">Business growth focus</p>
                  <p className="mt-1 text-sm text-white/52">Training, service and sales readiness</p>
                </div>
              </div>

              <div className="mt-7 flex flex-wrap gap-2">
                {ccwRoadshowTopics.map((topic) => (
                  <span
                    key={topic}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-sm text-white/62"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>

            <div id="booking">
              <CcwRoadshowBooking events={ccwRoadshowEvents} />
            </div>
          </div>
        </section>

        <section className="px-4 py-12">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] text-[#2490ed] uppercase">
                  Event Dates
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">
                  Choose your CCW location
                </h2>
              </div>
              <p className="max-w-xl text-sm leading-relaxed text-white/52">
                Both events run from 8.30am to 4.30pm on both days. Books are essential.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {ccwRoadshowEvents.map((event) => (
                <article
                  key={event.slug}
                  className="rounded-lg border border-white/10 bg-white/[0.03] p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-[#34d399]">{event.city}</p>
                      <h3 className="mt-1 text-2xl font-semibold text-white">{event.dates}</h3>
                      <p className="mt-2 text-sm text-white/55">{event.timeLabel}</p>
                    </div>
                    <span className="rounded-full bg-[rgba(36,144,237,0.12)] px-3 py-1 text-xs font-semibold text-[#2490ed]">
                      2 days
                    </span>
                  </div>

                  <div className="mt-5 flex gap-3 border-t border-white/8 pt-5">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#2490ed]" aria-hidden />
                    <div>
                      <p className="font-semibold text-white">{event.venueName}</p>
                      <p className="mt-1 text-sm text-white/52">
                        {event.streetAddress}, {event.suburbStatePostcode}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-white/8 bg-white/[0.025] px-4 py-12">
          <div className="mx-auto max-w-7xl">
            <div className="mb-7 max-w-3xl">
              <p className="text-xs font-semibold tracking-[0.18em] text-[#34d399] uppercase">
                Why, Who, What
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">
                A growth day built around practical decisions
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-white/55">
                The campaign pulls beginners, existing cleaners, growing teams and business buyers
                into one useful conversation: why the day matters, who should be in the room and
                what they should be able to do after it.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {Object.values(ccwRoadshowCampaignPillars).map((pillar) => (
                <article
                  key={pillar.eyebrow}
                  className="rounded-lg border border-white/10 bg-[#050505] p-5"
                >
                  <p className="text-xs font-semibold tracking-[0.18em] text-[#2490ed] uppercase">
                    {pillar.eyebrow}
                  </p>
                  <h3 className="mt-3 text-xl font-semibold leading-tight text-white">
                    {pillar.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/55">{pillar.body}</p>
                  <div className="mt-5 space-y-3">
                    {pillar.points.map((point) => (
                      <div key={point} className="flex gap-3">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#34d399]" />
                        <p className="text-sm leading-relaxed text-white/65">{point}</p>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-12">
          <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1fr_0.8fr]">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-[#2490ed] uppercase">
                Daily Focus
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">
                Built around outcomes you can use in the business
              </h2>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {ccwRoadshowCampaignPillars.achieve.points.map((item) => (
                  <div key={item} className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-sm leading-relaxed text-white/62">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-[rgba(52,211,153,0.24)] bg-[rgba(52,211,153,0.08)] p-5">
              <p className="text-sm font-semibold text-[#34d399]">Pricing</p>
              <div className="mt-4 space-y-3">
                {ccwRoadshowTicketPackages.map((pkg) => (
                  <div key={pkg.id} className="rounded-lg bg-[#050505]/70 p-4">
                    <p className="font-semibold text-white">{pkg.label}</p>
                    <p className="mt-1 text-2xl font-semibold text-[#34d399]">
                      {formatAudFromCents(pkg.unitAmountCents)}
                    </p>
                    <p className="mt-1 text-sm text-white/52">{pkg.description}</p>
                  </div>
                ))}
              </div>
              <Link
                href="#booking"
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-[#34d399]"
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
