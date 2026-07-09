import type { Metadata } from 'next';
import Link from 'next/link';
import { BreadcrumbSchema } from '@/components/seo';
import { MarketingPageShell, marketingPageInnerClass } from '@/components/marketing/MarketingPageShell';
import {
  HubCtaBanner,
  HubEmptyState,
  HubFilterPills,
  HubPageHeader,
  HubPlaceholderCard,
  HubSecondaryPills,
} from '@/components/marketing/hub/HubUi';
import { getBackendOrigin } from '@/lib/env/public-url';
import { filterExcludedEvents } from '@/lib/calendar/event-exclusions';
import {
  marketingHubCard,
  marketingHubSectionLabel,
  marketingTextMuted,
  marketingTextStrong,
  marketingTextSubtle,
  marketingTopicPill,
} from '@/lib/marketing/marketing-ui';
import { OG_IMAGES } from '@/lib/seo/og-image';

export const metadata: Metadata = {
  title: 'Industry Calendar — Restoration & Indoor Environment Events',
  description:
    'National calendar of Australian restoration, HVAC, flooring, and indoor environment industry events — conferences, training, webinars, and workshops. Stay connected with your industry.',
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

const EVENT_TYPE_COLOURS: Record<string, string> = {
  conference: 'bg-[#eef7ff] text-[#146fc2] dark:bg-[rgba(36,144,237,0.15)] dark:text-[#2490ed]',
  training: 'bg-emerald-50 text-emerald-700 dark:bg-[rgba(52,211,153,0.15)] dark:text-[#34d399]',
  'iicrc-school': 'bg-[#eef7ff] text-[#146fc2] dark:bg-[rgba(36,144,237,0.15)] dark:text-[#2490ed]',
  'carsi-training': 'bg-sky-50 text-sky-700 dark:bg-[rgba(56,189,248,0.15)] dark:text-[#38bdf8]',
  webinar: 'bg-violet-50 text-violet-700 dark:bg-[rgba(167,139,250,0.15)] dark:text-[#a78bfa]',
  workshop: 'bg-amber-50 text-amber-700 dark:bg-[rgba(251,191,36,0.15)] dark:text-[#fbbf24]',
  networking: 'bg-red-50 text-red-600 dark:bg-[rgba(248,113,113,0.15)] dark:text-[#f87171]',
  other: 'bg-slate-100 text-slate-600 dark:bg-white/[0.08] dark:text-white/50',
};

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
    // Hard exclusion (founder directive): the excluded coaching brand must never appear
    // on the calendar — see src/lib/calendar/event-exclusions.ts.
    return { ...json, data: filterExcludedEvents(json.data ?? []) };
  } catch {
    return { data: [], total: 0, limit: 50, offset: 0 };
  }
}

function formatEventDate(start: string, end: string | null): string {
  const startDt = new Date(start);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  if (!end) return startDt.toLocaleDateString('en-AU', opts);

  const endDt = new Date(end);
  if (startDt.toDateString() === endDt.toDateString()) {
    return startDt.toLocaleDateString('en-AU', opts);
  }
  const startStr = startDt.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  return `${startStr} – ${endDt.toLocaleDateString('en-AU', opts)}`;
}

function formatMonth(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
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
  return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));
}

function EventCard({ event }: { event: EventSummary }) {
  const typeColour = EVENT_TYPE_COLOURS[event.event_type] ?? EVENT_TYPE_COLOURS.other;
  const locationStr = event.is_virtual
    ? 'Online'
    : [event.location_name, event.location_city, event.location_state].filter(Boolean).join(', ') ||
      'Australia';

  return (
    <Link
      href={`/calendar/${event.id}`}
      className={`group flex flex-col gap-3 p-5 ${marketingHubCard}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${typeColour}`}
        >
          {event.event_type}
        </span>
        {event.is_free && (
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-[rgba(52,211,153,0.12)] dark:text-[#34d399]">
            Free
          </span>
        )}
        {event.featured && (
          <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-[rgba(251,191,36,0.12)] dark:text-[#fbbf24]">
            Featured
          </span>
        )}
      </div>

      <h3
        className={`text-base leading-snug font-semibold transition-colors group-hover:text-[#2490ed] ${marketingTextStrong}`}
      >
        {event.title}
      </h3>

      <div className={`flex flex-col gap-1 text-sm ${marketingTextMuted}`}>
        <span>{formatEventDate(event.start_date, event.end_date)}</span>
        <span className="flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${event.is_virtual ? 'bg-violet-500' : 'bg-[#2490ed]'}`}
          />
          {locationStr}
        </span>
      </div>

      {event.organiser_name && (
        <p className={`text-xs ${marketingTextSubtle}`}>By {event.organiser_name}</p>
      )}

      {event.industry_categories.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-1">
          {event.industry_categories.slice(0, 3).map((cat) => (
            <span key={cat} className={`rounded-md px-2 py-0.5 text-xs ${marketingTopicPill}`}>
              {cat}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; category?: string }>;
}) {
  const { type, category } = await searchParams;
  const { data: events, total } = await getEvents(type, category);

  const grouped = groupByMonth(events);
  const placeholderCount = Math.max(0, 3 - events.length);

  const breadcrumbs = [
    { name: 'Home', url: 'https://carsi.com.au' },
    { name: 'Industry Calendar', url: 'https://carsi.com.au/calendar' },
  ];

  return (
    <>
      <BreadcrumbSchema items={breadcrumbs} />

      <MarketingPageShell
        id="main-content"
        innerClassName={`${marketingPageInnerClass} mx-auto max-w-7xl`}
      >
        <HubPageHeader
          eyebrow={
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-[#2490ed]" />
              CARSI Industry Hub
            </>
          }
          title="Industry Calendar"
          description="National calendar of conferences, training, webinars, and workshops across the restoration, HVAC, flooring, and indoor environment industries."
          meta={total > 0 ? <span>{total} upcoming events</span> : undefined}
        />

        <div className="mb-4">
          <HubFilterPills
            items={EVENT_TYPES}
            activeValue={type}
            allLabel="All Types"
            buildHref={(value) => {
              const params = new URLSearchParams();
              if (value) params.set('type', value);
              if (category) params.set('category', category);
              const qs = params.toString();
              return qs ? `/calendar?${qs}` : '/calendar';
            }}
          />
        </div>

        <div className="mb-10">
          <HubSecondaryPills
            items={INDUSTRY_SEGMENTS.map((seg) => ({ value: seg, label: seg }))}
            activeValue={category}
            allLabel="All Segments"
            buildHref={(value) => {
              const params = new URLSearchParams();
              if (type) params.set('type', type);
              if (value) params.set('category', value);
              const qs = params.toString();
              return qs ? `/calendar?${qs}` : '/calendar';
            }}
          />
        </div>

        <HubCtaBanner
          title="Have an industry event to list?"
          description="Submit it for free — we review and publish within 24 hours."
          href="/submit/event"
          ctaLabel="Submit Event"
        />

        {grouped.length === 0 && placeholderCount === 0 ? (
          <HubEmptyState>
            {type || category
              ? 'No upcoming events match your filters — try a different combination.'
              : 'No upcoming events yet — check back soon or submit your event above.'}
          </HubEmptyState>
        ) : (
          <div className="space-y-12">
            {grouped.map(([monthKey, monthEvents]) => (
              <section key={monthKey}>
                <h2 className={`mb-4 text-lg ${marketingHubSectionLabel}`}>
                  {formatMonth(monthEvents[0].start_date)}
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {monthEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </section>
            ))}
            {placeholderCount > 0 && (
              <section>
                <h2 className={marketingHubSectionLabel}>Upcoming</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: placeholderCount }, (_, i) => (
                    <HubPlaceholderCard
                      key={`placeholder-${i}`}
                      message={`Event slot ${i + 1} — calendar populating`}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </MarketingPageShell>
    </>
  );
}
