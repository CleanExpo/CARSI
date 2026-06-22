import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BreadcrumbSchema, EventSchema } from '@/components/seo';
import {
  MarketingPageShell,
  marketingPageInnerNarrowClass,
} from '@/components/marketing/MarketingPageShell';
import { getBackendOrigin } from '@/lib/env/public-url';
import {
  marketingArticleProse,
  marketingBackLink,
  marketingBtnPrimary,
  marketingBtnSecondary,
  marketingHubSectionLabel,
  marketingLink,
  marketingMetaCard,
  marketingMetaLabel,
  marketingTextMuted,
  marketingTextStrong,
  marketingTopicPill,
} from '@/lib/marketing/marketing-ui';

const BACKEND_URL = getBackendOrigin();

interface EventDetail {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  industry_categories: string[];
  start_date: string;
  end_date: string | null;
  location_name: string | null;
  location_address: string | null;
  location_city: string | null;
  location_state: string | null;
  location_lat: string | null;
  location_lng: string | null;
  is_virtual: boolean;
  organiser_name: string | null;
  organiser_url: string | null;
  event_url: string | null;
  schema_event_status: string;
  ticket_url: string | null;
  is_free: boolean;
  price_range: string | null;
  image_url: string | null;
  featured: boolean;
  created_at: string;
  updated_at: string;
}

async function getEvent(id: string): Promise<EventDetail | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${BACKEND_URL}/api/events/${id}`, {
      next: { revalidate: 600 },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const event = await getEvent(id);

  if (!event) {
    return { title: 'Event Not Found | CARSI Hub' };
  }

  const startDt = new Date(event.start_date);
  const dateStr = startDt.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const locationStr = event.is_virtual
    ? 'Online'
    : [event.location_city, event.location_state].filter(Boolean).join(', ') || 'Australia';

  const description =
    event.description?.slice(0, 155) ??
    `${event.title} — ${dateStr} · ${locationStr}. Industry event for Australian restoration, HVAC, flooring, and indoor environment professionals.`;

  return {
    title: `${event.title} | CARSI Industry Calendar`,
    description,
    openGraph: {
      title: event.title,
      description,
      type: 'website',
      url: `https://carsi.com.au/calendar/${event.id}`,
      ...(event.image_url && { images: [{ url: event.image_url }] }),
    },
    alternates: { canonical: `https://carsi.com.au/calendar/${event.id}` },
  };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEvent(id);

  if (!event) notFound();

  const locationStr = event.is_virtual
    ? 'Online'
    : [event.location_name, event.location_city, event.location_state].filter(Boolean).join(', ') ||
      'Australia';

  const breadcrumbs = [
    { name: 'Home', url: 'https://carsi.com.au' },
    { name: 'Industry Calendar', url: 'https://carsi.com.au/calendar' },
    { name: event.title, url: `https://carsi.com.au/calendar/${event.id}` },
  ];

  return (
    <>
      <BreadcrumbSchema items={breadcrumbs} />
      <EventSchema
        name={event.title}
        description={event.description ?? undefined}
        startDate={event.start_date}
        endDate={event.end_date ?? undefined}
        url={`https://carsi.com.au/calendar/${event.id}`}
        locationName={event.location_name ?? undefined}
        locationAddress={event.location_address ?? undefined}
        locationCity={event.location_city ?? undefined}
        locationState={event.location_state ?? undefined}
        locationLat={event.location_lat ?? undefined}
        locationLng={event.location_lng ?? undefined}
        isVirtual={event.is_virtual}
        organiserName={event.organiser_name ?? undefined}
        organiserUrl={event.organiser_url ?? undefined}
        eventStatus={event.schema_event_status}
        ticketUrl={event.ticket_url ?? undefined}
        isFree={event.is_free}
        image={event.image_url ?? undefined}
        eventType={event.event_type}
      />

      <MarketingPageShell
        id="main-content"
        innerClassName={`${marketingPageInnerNarrowClass} mx-auto max-w-3xl`}
      >
        <Link href="/calendar" className={`mb-8 ${marketingBackLink}`}>
          ← Back to Calendar
        </Link>

        <div className="mb-6">
          <span className="mb-3 inline-flex items-center rounded-full bg-[#eef7ff] px-3 py-1 text-xs font-medium text-[#146fc2] capitalize dark:bg-[rgba(36,144,237,0.12)] dark:text-[#2490ed]">
            {event.event_type}
          </span>
          <h1 className={`mt-3 text-3xl leading-tight font-bold md:text-4xl ${marketingTextStrong}`}>
            {event.title}
          </h1>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className={marketingMetaCard}>
            <p className={marketingMetaLabel}>Date</p>
            <p className={`text-base font-semibold ${marketingTextStrong}`}>
              {formatDate(event.start_date)}
            </p>
            {event.end_date && event.end_date !== event.start_date && (
              <p className={`text-sm ${marketingTextMuted}`}>to {formatDate(event.end_date)}</p>
            )}
            <p className={`mt-1 text-sm ${marketingTextMuted}`}>{formatTime(event.start_date)}</p>
          </div>

          <div className={marketingMetaCard}>
            <p className={marketingMetaLabel}>{event.is_virtual ? 'Format' : 'Location'}</p>
            <p className={`text-base font-semibold ${marketingTextStrong}`}>{locationStr}</p>
            {event.location_address && !event.is_virtual && (
              <p className={`mt-1 text-sm ${marketingTextMuted}`}>{event.location_address}</p>
            )}
          </div>

          <div className={marketingMetaCard}>
            <p className={marketingMetaLabel}>Organiser</p>
            {event.organiser_url ? (
              <a
                href={event.organiser_url}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-base font-semibold ${marketingLink}`}
              >
                {event.organiser_name ?? 'View Organiser'}
              </a>
            ) : (
              <p className={`text-base font-semibold ${marketingTextStrong}`}>
                {event.organiser_name ?? '—'}
              </p>
            )}
          </div>

          <div className={marketingMetaCard}>
            <p className={marketingMetaLabel}>Cost</p>
            <p className={`text-base font-semibold ${marketingTextStrong}`}>
              {event.is_free ? 'Free' : (event.price_range ?? 'See event page')}
            </p>
          </div>
        </div>

        {event.description && (
          <section className="mb-8">
            <h2 className={`mb-3 text-lg font-semibold ${marketingTextStrong}`}>About This Event</h2>
            <div className={marketingArticleProse}>
              <p className="leading-relaxed whitespace-pre-line">{event.description}</p>
            </div>
          </section>
        )}

        {event.industry_categories.length > 0 && (
          <section className="mb-8">
            <h2 className={marketingHubSectionLabel}>Industry Segments</h2>
            <div className="flex flex-wrap gap-2">
              {event.industry_categories.map((cat) => (
                <span key={cat} className={`px-3 py-1 text-sm ${marketingTopicPill}`}>
                  {cat}
                </span>
              ))}
            </div>
          </section>
        )}

        <div className="flex flex-wrap gap-3">
          {event.event_url && (
            <a
              href={event.event_url}
              target="_blank"
              rel="noopener noreferrer"
              className={marketingBtnPrimary}
            >
              View Event Page ↗
            </a>
          )}
          {event.ticket_url && !event.is_free && (
            <a
              href={event.ticket_url}
              target="_blank"
              rel="noopener noreferrer"
              className={marketingBtnSecondary}
            >
              Register / Get Tickets ↗
            </a>
          )}
          <Link href="/calendar" className={marketingBtnSecondary}>
            ← Back to Calendar
          </Link>
        </div>
      </MarketingPageShell>
    </>
  );
}
