import type { Metadata } from 'next';
import Link from 'next/link';

import { HomeFinalCtaSection } from '@/components/landing/HomeFinalCtaSection';
import { HomeTrustStrip } from '@/components/landing/HomeTrustStrip';
import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import { CalendarAnytimeCourses } from '@/components/marketing/hub/CalendarAnytimeCourses';
import { CalendarEventLedger, CalendarMonthJump } from '@/components/marketing/hub/CalendarAgenda';
import { COMMUNITY_NAV } from '@/components/marketing/hub/community-nav';
import { HubEmptyState, HubFilterPills, HubSecondaryPills } from '@/components/marketing/hub/HubUi';
import { BreadcrumbSchema } from '@/components/seo';
import {
  buildCalendarCourseEntries,
  groupCoursesByTopic,
} from '@/lib/calendar/carsi-course-listing';
import { filterExcludedEvents } from '@/lib/calendar/event-exclusions';
import { getBackendOrigin } from '@/lib/env/public-url';
import { OG_IMAGES } from '@/lib/seo/og-image';
import { getPublishedCourseListItemsFromDatabase } from '@/lib/server/public-courses-list';

export const metadata: Metadata = {
  title: 'Industry Calendar — Australian Restoration Courses & Events',
  description:
    'Australian-produced CARSI courses you can start any time, plus a national calendar of restoration, HVAC, flooring, and indoor environment industry events — conferences, training, webinars, and workshops.',
  keywords: [
    'restoration industry events',
    'HVAC conferences Australia',
    'flooring industry training',
    'indoor environment webinars',
    'IICRC events',
    'CARSI calendar',
    'industry networking Australia',
  ],
  openGraph: {
    images: OG_IMAGES,
    title: 'Industry Calendar | CARSI Hub',
    description:
      'National calendar of Australian restoration and indoor environment industry events.',
    type: 'website',
    url: 'https://carsi.com.au/calendar',
  },
  alternates: { canonical: 'https://carsi.com.au/calendar' },
};

const BACKEND_URL = getBackendOrigin();

const EVENT_TYPES = [
  { value: 'conference', label: 'Conferences' },
  { value: 'training', label: 'Training' },
  { value: 'iicrc-school', label: 'IICRC Schools' },
  { value: 'carsi-training', label: 'CARSI Training Days' },
  { value: 'webinar', label: 'Webinars' },
  { value: 'workshop', label: 'Workshops' },
  { value: 'networking', label: 'Networking' },
];

const INDUSTRY_SEGMENTS = [
  'Restoration',
  'HVAC',
  'Flooring',
  'Indoor Air Quality',
  'Building & Construction',
  'Insurance & Claims',
  'Standards & Compliance',
];

interface EventSummary {
  id: string;
  title: string;
  event_type: string;
  industry_categories: string[];
  start_date: string;
  end_date: string | null;
  location_name: string | null;
  location_city: string | null;
  location_state: string | null;
  is_virtual: boolean;
  organiser_name: string | null;
  event_url: string | null;
  is_free: boolean;
  price_range: string | null;
  image_url: string | null;
  featured: boolean;
}

interface EventListResponse {
  data: EventSummary[];
  total: number;
  limit: number;
  offset: number;
}

async function getEvents(eventType?: string, category?: string): Promise<EventListResponse> {
  try {
    const params = new URLSearchParams({ limit: '50', offset: '0', upcoming_only: 'true' });
    if (eventType) params.set('event_type', eventType);
    if (category) params.set('category', category);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${BACKEND_URL}/api/events?${params}`, {
      next: { revalidate: 600 },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) return { data: [], total: 0, limit: 50, offset: 0 };
    const json = (await res.json()) as EventListResponse;
    return { ...json, data: filterExcludedEvents(json.data ?? []) };
  } catch {
    return { data: [], total: 0, limit: 50, offset: 0 };
  }
}

function groupByMonth(events: EventSummary[]): [string, EventSummary[]][] {
  const grouped = new Map<string, EventSummary[]>();
  for (const event of events) {
    const dt = new Date(event.start_date);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    const existing = grouped.get(key) ?? [];
    existing.push(event);
    grouped.set(key, existing);
  }
  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, list]) => [key, list.sort((a, b) => a.start_date.localeCompare(b.start_date))]);
}

function nextEventCopy(event: EventSummary | undefined): string | null {
  if (!event) return null;
  const when = new Date(event.start_date).toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return `Next dated listing: ${event.title} · ${when}`;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; category?: string }>;
}) {
  const { type, category } = await searchParams;
  const { data: events, total } = await getEvents(type, category);

  let courseEntries: ReturnType<typeof buildCalendarCourseEntries> = [];
  try {
    courseEntries = buildCalendarCourseEntries(await getPublishedCourseListItemsFromDatabase());
  } catch {
    courseEntries = [];
  }
  const courseTopics = groupCoursesByTopic(courseEntries);
  const grouped = groupByMonth(events);
  const placeholderCount = courseEntries.length > 0 ? 0 : Math.max(0, 3 - events.length);
  const nextUp = events.slice().sort((a, b) => a.start_date.localeCompare(b.start_date))[0];
  const monthJumps = grouped.map(([key, list]) => ({
    key,
    label: new Date(list[0].start_date).toLocaleDateString('en-AU', {
      month: 'short',
      year: 'numeric',
    }),
    count: list.length,
  }));

  const breadcrumbs = [
    { name: 'Home', url: 'https://carsi.com.au' },
    { name: 'Industry Calendar', url: 'https://carsi.com.au/calendar' },
  ];

  return (
    <>
      <BreadcrumbSchema items={breadcrumbs} />

      <section className="relative overflow-hidden border-b border-slate-200/70 bg-white">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_80%_0%,rgba(36,144,237,0.12),transparent_58%)]"
          aria-hidden
        />
        <div className={`relative ${PUBLIC_SHELL_INNER_CLASS} py-16 md:py-24`}>
          <div className="grid items-end gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(240px,0.7fr)]">
            <div>
              <p className={LANDING_EYEBROW_CLASS}>Industry calendar</p>
              <h1 className="mt-3 max-w-3xl font-[family-name:var(--font-display)] text-[2.15rem] leading-[1.1] font-semibold tracking-[-0.02em] text-slate-950 md:text-[3.1rem] md:leading-[1.06]">
                Dated field days, then start-anytime courses
              </h1>
              <p className={`mt-5 max-w-2xl text-pretty ${LANDING_LEAD_CLASS}`}>
                National conferences, training, webinars and workshops for restoration and indoor
                environment crews — plus Australian-produced CARSI courses you can open tonight.
              </p>
              {nextEventCopy(nextUp) ? (
                <p className="mt-6 max-w-xl text-sm font-medium text-slate-700">
                  {nextEventCopy(nextUp)}
                </p>
              ) : null}
              <nav className="mt-8 flex flex-wrap gap-2" aria-label="Community and resources">
                {COMMUNITY_NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition ${
                      item.href === '/calendar'
                        ? 'border-[#146fc2] bg-[#146fc2] text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-[#2490ed]/40 hover:text-[#146fc2]'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-[#fafbfc] p-6">
              <p className="text-[10px] font-semibold tracking-[0.18em] text-slate-400 uppercase">
                Today · Australia
              </p>
              <p className="mt-3 font-[family-name:var(--font-display)] text-[3rem] leading-none font-semibold tracking-[-0.04em] text-slate-950 tabular-nums">
                {new Date().toLocaleDateString('en-AU', { day: '2-digit' })}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {new Date().toLocaleDateString('en-AU', {
                  weekday: 'long',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              <p className="mt-5 text-xs leading-relaxed text-slate-400">
                Dated listings stay on the rail. Self-paced CARSI courses never receive a made-up
                start date.
              </p>
            </div>
          </div>
        </div>
      </section>

      <HomeTrustStrip
        stats={[
          { value: total > 0 ? String(total) : '—', label: 'Upcoming events' },
          { value: String(courseEntries.length), label: 'Start-anytime courses' },
          { value: String(monthJumps.length || '—'), label: 'Months on the rail' },
          { value: 'Free', label: 'To list an event' },
        ]}
      />

      <section className="border-t border-slate-200/70 bg-white py-10 md:py-12">
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <div className="mb-5">
            <HubFilterPills
              items={EVENT_TYPES}
              activeValue={type}
              allLabel="All types"
              buildHref={(value) => {
                const params = new URLSearchParams();
                if (value) params.set('type', value);
                if (category) params.set('category', category);
                const qs = params.toString();
                return qs ? `/calendar?${qs}` : '/calendar';
              }}
            />
          </div>
          <HubSecondaryPills
            items={INDUSTRY_SEGMENTS.map((seg) => ({ value: seg, label: seg }))}
            activeValue={category}
            allLabel="All segments"
            buildHref={(value) => {
              const params = new URLSearchParams();
              if (type) params.set('type', type);
              if (value) params.set('category', value);
              const qs = params.toString();
              return qs ? `/calendar?${qs}` : '/calendar';
            }}
          />
        </div>
      </section>

      <section className="border-t border-slate-200/70 bg-[#fafbfc] py-16 md:py-24">
        <div className={PUBLIC_SHELL_INNER_CLASS}>
          <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className={LANDING_EYEBROW_CLASS}>Agenda</p>
              <h2 className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>The dated rail</h2>
              <p className={`mt-4 max-w-xl ${LANDING_LEAD_CLASS}`}>
                Jump a month, then read each listing as a date stamp plus the job-site context.
              </p>
            </div>
            <CalendarMonthJump months={monthJumps} />
          </div>

          {grouped.length === 0 && placeholderCount === 0 ? (
            <HubEmptyState>
              {type || category
                ? 'No upcoming events match your filters — try a different combination.'
                : 'No upcoming dated events yet — check back soon or submit yours below.'}
            </HubEmptyState>
          ) : (
            <CalendarEventLedger grouped={grouped} placeholderCount={placeholderCount} />
          )}
        </div>
      </section>

      <CalendarAnytimeCourses topics={courseTopics} courseCount={courseEntries.length} />

      <section className="relative overflow-hidden border-t border-slate-200/70 bg-[#eef5fb] py-16 md:py-20">
        <div className={`relative ${PUBLIC_SHELL_INNER_CLASS} text-center`}>
          <p className={LANDING_EYEBROW_CLASS}>List an event</p>
          <h2 className={`mt-3 ${LANDING_DISPLAY_H2_CLASS}`}>Have a day the trade should see?</h2>
          <p className={`mx-auto mt-4 max-w-lg ${LANDING_LEAD_CLASS}`}>
            Submit it for free. We review and publish within 24 hours.
          </p>
          <Link
            href="/submit/event"
            className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-[#146fc2] px-8 text-sm font-semibold text-white shadow-[0_14px_40px_-16px_rgba(20,111,194,0.55)] transition hover:bg-[#0f5fa8]"
          >
            Submit event
          </Link>
        </div>
      </section>

      <HomeFinalCtaSection />
    </>
  );
}
