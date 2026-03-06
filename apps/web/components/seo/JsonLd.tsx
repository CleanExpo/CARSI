// JSON-LD Schema Components for SEO/GEO
// Following Schema.org vocabulary for maximum AI engine comprehension
// Note: Using dangerouslySetInnerHTML is the standard pattern for JSON-LD in React.
// Content is server-generated from controlled objects, not user input.

interface OrganizationSchemaProps {
  name?: string;
  url?: string;
  logo?: string;
  sameAs?: string[];
}

export function OrganizationSchema({
  name = 'CARSI',
  url = 'https://carsi.com.au',
  logo = 'https://carsi.com.au/logo.png',
  sameAs = [],
}: OrganizationSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name,
    url,
    logo,
    description:
      'IICRC-aligned continuing education platform for cleaning and restoration professionals in Australia.',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'AU',
    },
    areaServed: {
      '@type': 'Country',
      name: 'Australia',
    },
    sameAs,
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'info@carsi.com.au',
      contactType: 'customer service',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface WebsiteSchemaProps {
  name?: string;
  url?: string;
}

export function WebsiteSchema({
  name = 'CARSI',
  url = 'https://carsi.com.au',
}: WebsiteSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    url,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${url}/courses?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface CourseSchemaProps {
  name: string;
  description: string;
  provider?: string;
  url: string;
  price?: number;
  priceCurrency?: string;
  duration?: string;
  educationalLevel?: string;
  teaches?: string[];
  hasCourseInstance?: boolean;
}

export function CourseSchema({
  name,
  description,
  provider = 'CARSI',
  url,
  price,
  priceCurrency = 'AUD',
  duration,
  educationalLevel,
  teaches,
}: CourseSchemaProps) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name,
    description,
    provider: {
      '@type': 'EducationalOrganization',
      name: provider,
      url: 'https://carsi.com.au',
    },
    url,
    inLanguage: 'en-AU',
    isAccessibleForFree: price === 0,
  };

  if (price !== undefined && price > 0) {
    schema.offers = {
      '@type': 'Offer',
      price,
      priceCurrency,
      availability: 'https://schema.org/InStock',
    };
  }

  if (duration) {
    schema.timeRequired = `PT${duration}H`;
  }

  if (educationalLevel) {
    schema.educationalLevel = educationalLevel;
  }

  if (teaches && teaches.length > 0) {
    schema.teaches = teaches;
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface BreadcrumbSchemaProps {
  items: { name: string; url: string }[];
}

export function BreadcrumbSchema({ items }: BreadcrumbSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface FAQSchemaProps {
  questions: { question: string; answer: string }[];
}

export function FAQSchema({ questions }: FAQSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map((q) => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: q.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
