/**
 * JSON-LD JobPosting schema builder (schema.org)
 * Used by the CARSI Job Board to emit structured data for Google Rich Results.
 */

export interface JobPostingData {
  title: string;
  company_name: string;
  company_website?: string | null;
  description: string;
  employment_type: string;
  location_city?: string | null;
  location_state?: string | null;
  location_postcode?: string | null;
  is_remote: boolean;
  salary_min?: number | null;
  salary_max?: number | null;
  apply_url?: string | null;
  valid_through: Date | string;
  created_at: Date | string;
}

/**
 * Converts CARSI employment_type to schema.org EmploymentType enum values.
 */
function mapEmploymentType(type: string): string {
  const map: Record<string, string> = {
    FULL_TIME: 'FULL_TIME',
    PART_TIME: 'PART_TIME',
    CONTRACTOR: 'CONTRACTOR',
    CASUAL: 'TEMPORARY',
    INTERNSHIP: 'INTERN',
  };
  return map[type] ?? 'OTHER';
}

export function buildJobPostingSchema(job: JobPostingData): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description,
    datePosted: new Date(job.created_at).toISOString().split('T')[0],
    validThrough: new Date(job.valid_through).toISOString(),
    employmentType: mapEmploymentType(job.employment_type),
    hiringOrganization: {
      '@type': 'Organization',
      name: job.company_name,
      ...(job.company_website ? { url: job.company_website } : {}),
    },
    jobLocationType: job.is_remote ? 'TELECOMMUTE' : undefined,
    applicantLocationRequirements: job.is_remote
      ? { '@type': 'Country', name: 'Australia' }
      : undefined,
  };

  if (!job.is_remote && (job.location_city || job.location_state)) {
    schema.jobLocation = {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'AU',
        ...(job.location_city ? { addressLocality: job.location_city } : {}),
        ...(job.location_state ? { addressRegion: job.location_state } : {}),
        ...(job.location_postcode ? { postalCode: job.location_postcode } : {}),
      },
    };
  }

  if (job.salary_min || job.salary_max) {
    schema.baseSalary = {
      '@type': 'MonetaryAmount',
      currency: 'AUD',
      value: {
        '@type': 'QuantitativeValue',
        ...(job.salary_min ? { minValue: job.salary_min } : {}),
        ...(job.salary_max ? { maxValue: job.salary_max } : {}),
        unitText: 'YEAR',
      },
    };
  }

  if (job.apply_url) {
    schema.url = job.apply_url;
  }

  // Remove undefined values
  return JSON.parse(JSON.stringify(schema));
}
