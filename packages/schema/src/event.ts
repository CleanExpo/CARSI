/**
 * JSON-LD Event schema builder (schema.org)
 * Used by the CARSI Industry Calendar.
 */

export interface IndustryEventData {
  id: string;
  title: string;
  event_type: string;
  start_date: Date | string;
  end_date?: Date | string | null;
  location_name?: string | null;
  location_address?: string | null;
  lat?: number | null;
  lng?: number | null;
  is_virtual: boolean;
  event_url?: string | null;
  organiser_name?: string | null;
  organiser_url?: string | null;
  schema_event_status?: string | null;
  ticket_url?: string | null;
  is_free: boolean;
  price_range?: string | null;
  image_url?: string | null;
  industry_categories?: string[];
}

export function buildEventSchema(event: IndustryEventData): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    startDate: new Date(event.start_date).toISOString(),
    eventStatus: `https://schema.org/${event.schema_event_status ?? 'EventScheduled'}`,
    eventAttendanceMode: event.is_virtual
      ? 'https://schema.org/OnlineEventAttendanceMode'
      : 'https://schema.org/OfflineEventAttendanceMode',
  };

  if (event.end_date) {
    schema.endDate = new Date(event.end_date).toISOString();
  }

  if (!event.is_virtual && event.location_name) {
    const place: Record<string, unknown> = {
      '@type': 'Place',
      name: event.location_name,
    };
    if (event.location_address) {
      place.address = {
        '@type': 'PostalAddress',
        streetAddress: event.location_address,
        addressCountry: 'AU',
      };
    }
    if (event.lat && event.lng) {
      place.geo = {
        '@type': 'GeoCoordinates',
        latitude: event.lat,
        longitude: event.lng,
      };
    }
    schema.location = place;
  }

  if (event.organiser_name) {
    schema.organizer = {
      '@type': 'Organization',
      name: event.organiser_name,
      ...(event.organiser_url ? { url: event.organiser_url } : {}),
    };
  }

  if (event.image_url) {
    schema.image = event.image_url;
  }

  if (event.event_url) {
    schema.url = event.event_url;
  }

  schema.offers = {
    '@type': 'Offer',
    price: event.is_free ? '0' : undefined,
    priceCurrency: 'AUD',
    ...(event.ticket_url ? { url: event.ticket_url } : {}),
    availability: 'https://schema.org/InStock',
  };

  return JSON.parse(JSON.stringify(schema));
}
