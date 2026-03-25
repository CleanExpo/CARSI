/**
 * lib/schema/event.ts
 * Generates schema.org/Event JSON-LD from industry_events rows.
 * Pass the result to <SchemaMarkup schema={...} />.
 */

import type { SchemaObject } from './shared';

export interface EventSchemaInput {
  name: string;
  description?: string;
  startDate: string; // ISO 8601
  endDate?: string;
  url: string;
  locationName?: string;
  locationAddress?: string;
  locationCity?: string;
  locationState?: string;
  locationLat?: string;
  locationLng?: string;
  isVirtual?: boolean;
  organiserName?: string;
  organiserUrl?: string;
  /** schema.org EventStatus value without namespace prefix, e.g. "EventScheduled" */
  eventStatus?: string;
  ticketUrl?: string;
  isFree?: boolean;
  image?: string;
  /** additionalType hint, e.g. "conference" */
  eventType?: string;
}

export function buildEventSchema(input: EventSchemaInput): SchemaObject {
  const {
    name,
    description,
    startDate,
    endDate,
    url,
    locationName,
    locationAddress,
    locationCity,
    locationState,
    locationLat,
    locationLng,
    isVirtual = false,
    organiserName,
    organiserUrl,
    eventStatus = 'EventScheduled',
    ticketUrl,
    isFree,
    image,
    eventType,
  } = input;

  const schema: SchemaObject = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name,
    startDate,
    url,
    eventStatus: `https://schema.org/${eventStatus}`,
    eventAttendanceMode: isVirtual
      ? 'https://schema.org/OnlineEventAttendanceMode'
      : 'https://schema.org/OfflineEventAttendanceMode',
    inLanguage: 'en-AU',
    organizer: {
      '@type': 'Organization',
      name: organiserName ?? 'CARSI',
      url: organiserUrl ?? 'https://carsi.com.au',
    },
  };

  if (endDate) schema.endDate = endDate;
  if (description) schema.description = description;
  if (image) schema.image = image;
  if (eventType) schema.additionalType = eventType;

  if (!isVirtual && (locationName || locationCity)) {
    const place: SchemaObject = { '@type': 'Place' };
    if (locationName) place.name = locationName;
    const address: SchemaObject = { '@type': 'PostalAddress', addressCountry: 'AU' };
    if (locationAddress) address.streetAddress = locationAddress;
    if (locationCity) address.addressLocality = locationCity;
    if (locationState) address.addressRegion = locationState;
    place.address = address;
    if (locationLat && locationLng) {
      place.geo = {
        '@type': 'GeoCoordinates',
        latitude: locationLat,
        longitude: locationLng,
      };
    }
    schema.location = place;
  } else if (isVirtual) {
    schema.location = { '@type': 'VirtualLocation', url };
  }

  if (isFree !== undefined) {
    schema.isAccessibleForFree = isFree;
    if (!isFree && ticketUrl) {
      schema.offers = {
        '@type': 'Offer',
        url: ticketUrl,
        availability: 'https://schema.org/InStock',
      };
    }
  }

  return schema;
}
