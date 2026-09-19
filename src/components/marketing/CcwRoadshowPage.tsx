import Link from 'next/link';
import { ArrowRight, MapPin } from 'lucide-react';

import { HomeFaqSection } from '@/components/landing/HomeFaqSection';
import { HomeFinalCtaSection } from '@/components/landing/HomeFinalCtaSection';
import { HomeTrustStrip } from '@/components/landing/HomeTrustStrip';
import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import { CcwEventNav } from '@/components/marketing/CcwEventNav';
import { CcwRoadshowBooking } from '@/components/marketing/CcwRoadshowBooking';
import { BreadcrumbSchema, EventSchema, FAQSchema, ItemListSchema } from '@/components/seo';
import { getPublicSiteUrl } from '@/lib/env/public-url';
import {
  allowsFreeEntryRegistration,
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
  getCcwRoadshowEvent,
} from '@/lib/marketing/ccw-roadshow';

const siteUrl = getPublicSiteUrl();
const canonical = `${siteUrl}${ccwRoadshowPath}`;

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
      'Melbourne is free for past and current CCW customers - register on the CARSI event page to claim a free entry token for check-in. Sydney and Brisbane seats are booked through Carpet Cleaners Warehouse, not on this page.',
  },
  {
    question: 'Where are the Melbourne, Sydney and Brisbane events held?',
    answer:
      'Melbourne is held at Carpet Cleaners Warehouse, Unit 1/5 Gatwick Road, Bayswater North VIC 3153. Sydney is held at Carpet Cleaners Warehouse, 2/8 Tollis Place, Seven Hills NSW 2147. Brisbane is held at Carpet Cleaners Warehouse, D1-3/194 Zillmere Road, Boondall QLD 4034.',
  },
  {
    question: 'What topics are covered?',
    answer:
      'The program connects carpet cleaning, rug cleaning, stain removal, tile cleaning, professional equipment, chemistry, service design, quoting confidence, profitable service growth and practical CCW facility demonstrations.',
  },
];

export type CcwFocusCity = 'melbourne' | 'sydney' | 'brisbane';

function stopIndex(slug: string): string {
  const i = ccwRoadshowEvents.findIndex((e) => e.slug === slug);
  return String(i + 1).padStart(2, '0');
}

export function CcwRoadshowContent({ focusSlug }: { focusSlug?: CcwFocusCity }) {
  const focusEvent = focusSlug ? getCcwRoadshowEvent(focusSlug) : null;
  const currentHref = focusSlug ? `/ccw-${focusSlug}` : ccwRoadshowPath;

  return (
    <>
      <BreadcrumbSchema items={breadcrumbs} />
      <FAQSchema questions={faqs} />
      <ItemListSchema
        name="CARSI x CCW Business Growth Days event dates"
        description="Melbourne, Sydney and Brisbane CARSI x CCW roadshow events for cleaners who want better jobs, stronger quoting confidence and practical business growth."
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
          isFree={allowsFreeEntryRegistration(event)}
          image={`${siteUrl}/og-image.png`}
          eventType="BusinessEvent"
        />
      ))}

      <section className="relative overflow-hidden border-b border-slate-200/70 bg-white">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_85%_0%,rgba(36,144,237,0.12),transparent_58%)]"
          aria-hidden
        />
        <div className={`relative ${PUBLIC_SHELL_INNER_CLASS} py-16 md:py-24`}>
          <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)] lg:gap-16">
            <div>
              <p className={LANDING_EYEBROW_CLASS}>
                {focusEvent
                  ? `Stop ${stopIndex(focusEvent.slug)} · ${focusEvent.city}`
                  : 'CARSI × CCW roadshow'}
              </p>
              <h1 className="mt-3 max-w-3xl font-[family-name:var(--font-display)] text-[2.15rem] leading-[1.1] font-semibold tracking-[-0.02em] text-slate-950 md:text-[3.1rem] md:leading-[1.06]">
                {focusEvent ? `${focusEvent.city} growth days` : ccwRoadshowHeroHeadline}
              </h1>
              <p className="mt-3 text-sm font-semibold text-[#a85500]">
                Two days with {ccwRoadshowPresenter.name}
                {focusEvent ? ` · ${focusEvent.dates}` : ''}
              </p>
              <p className={`mt-5 max-w-xl text-pretty ${LANDING_LEAD_CLASS}`}>
                Practical business-growth training inside Carpet Cleaners Warehouse locations. Connect
                training, equipment, chemistry, quoting and services that can grow profitably.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {ccwRoadshowTopics.map((topic) => (
                  <span
                    key={topic}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-600"
                  >
                    {topic}
                  </span>
                ))}
              </div>
              <CcwEventNav current={currentHref} />
              <div className="mt-8">
                <Link
                  href="#program"
                  className="inline-flex min-h-12 items-center gap-2 rounded-full border border-slate-200 bg-white px-7 text-sm font-semibold text-slate-800 hover:border-[#2490ed]/40 hover:text-[#146fc2]"
                >
                  View the program
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </div>
            <div id="booking" className="lg:sticky lg:top-28">
              <CcwRoadshowBooking events={ccwRoadshowEvents} initialSlug={focusSlug} />
            </div>
          </div>
        </div>
      </section>

      <HomeTrustStrip
        stats={[
          {
            value: focusEvent?.dates ?? '3 cities',
            label: focusEvent ? focusEvent.city : 'National stops',
          },
          {
            value: focusEvent
              ? allowsFreeEntryRegistration(focusEvent)
                ? 'Free'
                : 'Via CCW'
              : 'Varies',
            label: 'Entry',
          },
          { value: '2 days', label: '8.30am–4.30pm' },
          { value: String(focusEvent?.capacity ?? 20), label: 'Room size' },
        ]}
      />

      <section className="border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-24">
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <p className={LANDING_EYEBROW_CLASS}>The itinerary</p>
          <h2 className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>Three warehouse stops</h2>
          <p className={`mt-4 max-w-xl ${LANDING_LEAD_CLASS}`}>
            Both days run 8.30am to 4.30pm. Rooms stay small so the work stays practical.
          </p>
          <ol className="relative mt-12 space-y-4">
            <div
              className="pointer-events-none absolute top-8 bottom-8 left-[1.7rem] hidden w-px bg-slate-200 sm:block"
              aria-hidden
            />
            {ccwRoadshowEvents.map((event) => {
              const active = focusSlug === event.slug;
              const free = allowsFreeEntryRegistration(event);
              return (
                <li key={event.slug}>
                  <Link
                    href={`/ccw-${event.slug}`}
                    className={`group relative grid gap-4 rounded-2xl border bg-white p-5 shadow-sm transition sm:grid-cols-[5.5rem_1fr] sm:gap-8 sm:p-6 ${
                      active
                        ? 'border-[#146fc2] shadow-[0_18px_40px_-24px_rgba(20,111,194,0.4)]'
                        : 'border-slate-200/80 hover:border-[#2490ed]/35'
                    }`}
                  >
                    <div className="relative z-10 flex h-[4.5rem] w-[4.5rem] flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-[#fafbfc]">
                      <span className="font-[family-name:var(--font-display)] text-[1.5rem] leading-none font-semibold text-slate-950 tabular-nums">
                        {stopIndex(event.slug)}
                      </span>
                      <span className="mt-1 text-[10px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
                        {event.state}
                      </span>
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[11px] font-medium tracking-[0.18em] text-[#146fc2] uppercase">
                          {event.city}
                        </p>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] text-slate-600">
                          {free ? 'Free CCW entry' : 'Booked through CCW'}
                        </span>
                      </div>
                      <h3 className="mt-2 font-[family-name:var(--font-display)] text-xl font-semibold text-slate-950 group-hover:text-[#146fc2]">
                        {event.dates}
                      </h3>
                      <p className="mt-2 flex items-start gap-2 text-sm text-slate-500">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#146fc2]" aria-hidden />
                        {event.venueName}, {event.streetAddress}, {event.suburbStatePostcode}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">{event.timeLabel}</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section
        id="program"
        className="border-t border-slate-200/70 bg-white py-16 md:py-24"
      >
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <p className={LANDING_EYEBROW_CLASS}>Why, who, what</p>
          <h2 className={`mt-3 max-w-2xl ${LANDING_DISPLAY_H2_CLASS}`}>
            Business improvement, not just a chemical day
          </h2>
          <p className={`mt-4 max-w-2xl ${LANDING_LEAD_CLASS}`}>
            Two days with Phill, CARSI and the CCW team connecting services, equipment, chemicals and
            real customer decisions into a plan you can use.
          </p>
          <div className="mt-12 grid gap-10 border-t border-slate-200/70 pt-10 md:grid-cols-3">
            {Object.values(ccwRoadshowCampaignPillars).map((pillar, i) => (
              <article
                key={pillar.eyebrow}
                className="md:border-l md:border-slate-200/70 md:pl-8 md:first:border-l-0 md:first:pl-0"
              >
                <p className="font-[family-name:var(--font-display)] text-[2rem] leading-none font-semibold text-slate-300 tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </p>
                <p className="mt-5 text-[11px] font-medium tracking-[0.18em] text-[#146fc2] uppercase">
                  {pillar.eyebrow}
                </p>
                <h3 className="mt-2 font-[family-name:var(--font-display)] text-lg font-semibold text-slate-950">
                  {pillar.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">{pillar.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-24">
        <div className={`${PUBLIC_SHELL_INNER_CLASS} grid gap-12 lg:grid-cols-[1.1fr_0.9fr]`}>
          <div>
            <p className={LANDING_EYEBROW_CLASS}>Walk away with</p>
            <h2 className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>Strategies you can use immediately</h2>
            <ul className="mt-10 space-y-4">
              {ccwRoadshowCampaignPillars.achieve.points.map((item) => (
                <li
                  key={item}
                  className="border-l-2 border-[#2490ed]/35 pl-5 text-sm leading-relaxed text-slate-600"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-7 shadow-sm">
            {focusEvent && !allowsFreeEntryRegistration(focusEvent) ? (
              <>
                <p className={LANDING_EYEBROW_CLASS}>Booked through CCW</p>
                <h3 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-semibold text-slate-950">
                  {focusEvent.city} seats are sold by Carpet Cleaners Warehouse
                </h3>
                <p className={`mt-3 ${LANDING_LEAD_CLASS}`}>
                  {focusEvent.city} is not part of the free CCW entry offer. Contact Carpet Cleaners
                  Warehouse to book a place for {focusEvent.dates}.
                </p>
              </>
            ) : (
              <>
                <p className={LANDING_EYEBROW_CLASS}>Free CCW customer entry</p>
                <h3 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-semibold text-slate-950">
                  {ccwRoadshowFreeEntryOffer.headline}
                </h3>
                <p className={`mt-3 ${LANDING_LEAD_CLASS}`}>
                  {ccwRoadshowFreeEntryOffer.detail}
                  {focusEvent
                    ? ''
                    : ' This applies to Melbourne only — Sydney and Brisbane are paid seats booked through Carpet Cleaners Warehouse.'}
                </p>
                <div className="mt-6 space-y-3">
                  {ccwRoadshowTicketPackages.map((pkg) => (
                    <div key={pkg.id} className="rounded-xl border border-slate-200/80 bg-[#fafbfc] p-4">
                      <p className="text-sm font-semibold text-slate-950">{pkg.label}</p>
                      <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold text-slate-950">
                        {formatAudFromCents(pkg.unitAmountCents)}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">{pkg.description}</p>
                    </div>
                  ))}
                </div>
                <Link
                  href="#booking"
                  className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#146fc2] px-6 text-sm font-semibold text-white hover:bg-[#0f5fa8]"
                >
                  Claim your free entry token
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200/70 bg-white py-16 md:py-24">
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <p className={LANDING_EYEBROW_CLASS}>Why the warehouse</p>
          <h2 className={`mt-3 max-w-2xl ${LANDING_DISPLAY_H2_CLASS}`}>
            Practical training inside Carpet Cleaners Warehouse
          </h2>
          <p className={`mt-4 max-w-2xl ${LANDING_LEAD_CLASS}`}>
            Not a hotel-room lecture. The days happen inside CCW locations so training connects to
            equipment, chemical choices and the questions cleaners ask before they buy or quote.{' '}
            {ccwRoadshowPresenter.value}
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {ccwRoadshowFacilityAdvantages.map((item, i) => (
              <div
                key={item}
                className="rounded-2xl border border-slate-200/80 bg-[#fafbfc] p-6"
              >
                <p className="font-mono text-[11px] font-semibold tracking-[0.16em] text-[#146fc2]">
                  {String(i + 1).padStart(2, '0')}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <HomeFaqSection faqs={faqs} />
      <HomeFinalCtaSection />
    </>
  );
}
