/**
 * JSON-LD Person + LocalBusiness schema builders (schema.org)
 * Used by the CARSI Professional Directory to emit structured data.
 */

export interface ProfessionalData {
  id: string;
  name: string;
  business_name?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  bio?: string | null;
  certifications?: string[];
  industries?: string[];
  service_areas?: string[];
  location_city?: string | null;
  location_state?: string | null;
  location_postcode?: string | null;
  lat?: number | null;
  lng?: number | null;
  nrpg_membership_tier?: string | null;
}

export function buildPersonSchema(professional: ProfessionalData): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: professional.name,
    ...(professional.email ? { email: professional.email } : {}),
    ...(professional.phone ? { telephone: professional.phone } : {}),
    ...(professional.website ? { url: professional.website } : {}),
    ...(professional.bio ? { description: professional.bio } : {}),
  };

  if (professional.certifications?.length) {
    schema.hasCredential = professional.certifications.map((cert) => ({
      '@type': 'EducationalOccupationalCredential',
      name: cert,
    }));
  }

  if (professional.location_city || professional.location_state) {
    schema.address = {
      '@type': 'PostalAddress',
      addressCountry: 'AU',
      ...(professional.location_city ? { addressLocality: professional.location_city } : {}),
      ...(professional.location_state ? { addressRegion: professional.location_state } : {}),
      ...(professional.location_postcode ? { postalCode: professional.location_postcode } : {}),
    };
  }

  if (professional.lat && professional.lng) {
    schema.geo = {
      '@type': 'GeoCoordinates',
      latitude: professional.lat,
      longitude: professional.lng,
    };
  }

  if (professional.industries?.length) {
    schema.knowsAbout = professional.industries;
  }

  return JSON.parse(JSON.stringify(schema));
}

export function buildLocalBusinessSchema(professional: ProfessionalData): Record<string, unknown> {
  if (!professional.business_name) {
    return buildPersonSchema(professional);
  }

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: professional.business_name,
    ...(professional.email ? { email: professional.email } : {}),
    ...(professional.phone ? { telephone: professional.phone } : {}),
    ...(professional.website ? { url: professional.website } : {}),
    ...(professional.bio ? { description: professional.bio } : {}),
    employee: {
      '@type': 'Person',
      name: professional.name,
    },
  };

  if (professional.location_city || professional.location_state) {
    schema.address = {
      '@type': 'PostalAddress',
      addressCountry: 'AU',
      ...(professional.location_city ? { addressLocality: professional.location_city } : {}),
      ...(professional.location_state ? { addressRegion: professional.location_state } : {}),
      ...(professional.location_postcode ? { postalCode: professional.location_postcode } : {}),
    };
  }

  if (professional.lat && professional.lng) {
    schema.geo = {
      '@type': 'GeoCoordinates',
      latitude: professional.lat,
      longitude: professional.lng,
    };
  }

  if (professional.service_areas?.length) {
    schema.areaServed = professional.service_areas;
  }

  return JSON.parse(JSON.stringify(schema));
}
