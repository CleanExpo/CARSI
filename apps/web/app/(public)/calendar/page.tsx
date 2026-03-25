import type { Metadata } from 'next';
import Link from 'next/link';
import { BreadcrumbSchema } from '@/components/seo';

export const metadata: Metadata = {
  title: 'Industry Calendar | CARSI Hub',
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
    title: 'Industry Calendar | CARSI Hub',
    description:
      'National calendar of Australian restoration and indoor environment industry events.',
    type: 'website',
    url: 'https://carsi.com.au/calendar',
  },
  alternates: { canonical: 'https://carsi.com.au/calendar' },
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

const EVENT_TYPES = [
  { value: 'conference', label: 'Conferences' },
  { value: 'training', label: 'Training' },
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
  conference: 'bg-primary/15 text-primary',
  training: 'bg-emerald-400/15 text-emerald-400',
  webinar: 'bg-violet-400/15 text-violet-400',
  workshop: 'bg-amber-400/15 text-amber-400',
  networking: 'bg-red-400/15 text-red-400',
  other: 'bg-secondary text-muted-foreground',
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
    return res.json();
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
      className="group flex flex-col gap-3 rounded-sm border border-border bg-card p-5 transition-all duration-200 hover:border-primary/35 hover:bg-card/80 hover:shadow-[0_8px_40px_hsl(var(--primary)/0.12)]"
    >
      {/* Type + free badge */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${typeColour}`}
        >
          {event.event_type}
        </span>
        {event.is_free && (
          <span className="inline-flex items-center rounded-full bg-emerald-400/12 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
            Free
          </span>
        )}
        {event.featured && (
          <span className="inline-flex items-center rounded-full bg-amber-400/12 px-2.5 py-0.5 text-xs font-medium text-amber-400">
            Featured
          </span>
        )}
      </div>

      <h3 className="text-base leading-snug font-semibold text-foreground transition-colors group-hover:text-primary">
        {event.title}
      </h3>

      {/* Date + location */}
      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
        <span>{formatEventDate(event.start_date, event.end_date)}</span>
        <span className="flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${event.is_virtual ? 'bg-violet-400' : 'bg-primary'}`}
          />
          {locationStr}
        </span>
      </div>

      {event.organiser_name && <p className="text-xs text-muted-foreground/50">By {event.organiser_name}</p>}

      {event.industry_categories.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-1">
          {event.industry_categories.slice(0, 3).map((cat) => (
            <span
              key={cat}
              className="rounded-sm bg-secondary px-2 py-0.5 text-xs text-muted-foreground/60"
            >
              {cat}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}

// Placeholder card — shown when no events exist yet
function PlaceholderCard({ index }: { index: number }) {
  return (
    <div className="flex flex-col gap-3 rounded-sm border border-dashed border-border bg-card/30 p-5">
      <div className="h-5 w-20 animate-pulse rounded-full bg-muted/20" />
      <div className="h-5 w-4/5 animate-pulse rounded bg-muted/20" />
      <div className="space-y-1.5">
        <div className="h-4 w-1/2 animate-pulse rounded bg-muted/10" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted/10" />
      </div>
      <p className="mt-auto text-xs text-muted-foreground/40">Event slot {index} — calendar populating</p>
    </div>
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

      <main className="min-h-screen bg-background px-4 py-16">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-12">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              CARSI Industry Hub
            </div>
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              Industry Calendar
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              National calendar of conferences, training, webinars, and workshops across the
              restoration, HVAC, flooring, and indoor environment industries.
            </p>
            {total > 0 && <p className="mt-2 text-sm text-muted-foreground/60">{total} upcoming events</p>}
          </div>

          {/* Filters row */}
          <div className="mb-4 flex flex-wrap gap-2">
            <Link
              href="/calendar"
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                !type
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border text-muted-foreground hover:border-primary/35 hover:text-foreground'
              }`}
            >
              All Types
            </Link>
            {EVENT_TYPES.map((et) => (
              <Link
                key={et.value}
                href={`/calendar?type=${et.value}${category ? `&category=${encodeURIComponent(category)}` : ''}`}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  type === et.value
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border text-muted-foreground hover:border-primary/35 hover:text-foreground'
                }`}
              >
                {et.label}
              </Link>
            ))}
          </div>

          <div className="mb-10 flex flex-wrap gap-2">
            <Link
              href={type ? `/calendar?type=${type}` : '/calendar'}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                !category
                  ? 'bg-secondary text-foreground/70'
                  : 'border border-border text-muted-foreground/60 hover:text-muted-foreground'
              }`}
            >
              All Segments
            </Link>
            {INDUSTRY_SEGMENTS.map((seg) => (
              <Link
                key={seg}
                href={`/calendar?${type ? `type=${type}&` : ''}category=${encodeURIComponent(seg)}`}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  category === seg
                    ? 'bg-secondary text-foreground/70'
                    : 'border border-border text-muted-foreground/60 hover:text-muted-foreground'
                }`}
              >
                {seg}
              </Link>
            ))}
          </div>

          {/* Submit event CTA */}
          <div className="mb-10 flex items-center justify-between rounded-sm border border-border bg-card px-6 py-4">
            <div>
              <p className="text-sm font-medium text-foreground/80">Have an industry event to list?</p>
              <p className="text-xs text-muted-foreground">
                Submit it for free — we review and publish within 24 hours.
              </p>
            </div>
            <Link
              href="/calendar/submit"
              className="rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Submit Event
            </Link>
          </div>

          {/* Events grouped by month */}
          {grouped.length === 0 && placeholderCount === 0 ? (
            <div className="rounded-sm border border-border bg-card p-16 text-center">
              <p className="text-muted-foreground">
                {type || category
                  ? 'No upcoming events match your filters — try a different combination.'
                  : 'No upcoming events yet — check back soon or submit your event above.'}
              </p>
            </div>
          ) : (
            <div className="space-y-12">
              {grouped.map(([monthKey, monthEvents]) => (
                <section key={monthKey}>
                  <h2 className="mb-4 text-xs font-semibold tracking-widest text-muted-foreground/60 uppercase">
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
                  <h2 className="mb-4 text-xs font-semibold tracking-widest text-muted-foreground/40 uppercase">
                    Upcoming
                  </h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: placeholderCount }, (_, i) => (
                      <PlaceholderCard key={`placeholder-${i}`} index={i + 1} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
