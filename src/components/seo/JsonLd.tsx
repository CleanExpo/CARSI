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
  sameAs = [
    'https://www.facebook.com/CARSIaus',
    'https://www.linkedin.com/company/carsiaus',
    'https://www.youtube.com/channel/UC3HpNvGJXivLGoPo4m7Qleg/featured',
    'https://open.spotify.com/show/4FVBn8Cfyx2jOx0m4MksuG',
  ],
}: OrganizationSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    '@id': 'https://carsi.com.au/#organization',
    name,
    alternateName: 'Centre for Australian Restoration and Standards Information',
    url,
    logo,
    image: `${url}/og-image.png`,
    description:
      "Australia's leading online training platform for disaster restoration professionals. IICRC-aligned CEC courses in water, fire, and carpet restoration delivered to students Australia-wide.",
    telephone: '+61457123005',
    email: 'support@carsi.com.au',
    // SAB: postal address only — no street address exposed publicly
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Forest Lake',
      addressRegion: 'QLD',
      addressCountry: 'AU',
    },
    // SAB: explicit state-by-state service area coverage
    areaServed: [
      {
        '@type': 'AdministrativeArea',
        name: 'New South Wales',
        sameAs: 'https://en.wikipedia.org/wiki/New_South_Wales',
      },
      {
        '@type': 'AdministrativeArea',
        name: 'Victoria',
        sameAs: 'https://en.wikipedia.org/wiki/Victoria_(Australia)',
      },
      {
        '@type': 'AdministrativeArea',
        name: 'Queensland',
        sameAs: 'https://en.wikipedia.org/wiki/Queensland',
      },
      {
        '@type': 'AdministrativeArea',
        name: 'Western Australia',
        sameAs: 'https://en.wikipedia.org/wiki/Western_Australia',
      },
      {
        '@type': 'AdministrativeArea',
        name: 'South Australia',
        sameAs: 'https://en.wikipedia.org/wiki/South_Australia',
      },
      {
        '@type': 'AdministrativeArea',
        name: 'Tasmania',
        sameAs: 'https://en.wikipedia.org/wiki/Tasmania',
      },
      {
        '@type': 'AdministrativeArea',
        name: 'Australian Capital Territory',
        sameAs: 'https://en.wikipedia.org/wiki/Australian_Capital_Territory',
      },
      {
        '@type': 'AdministrativeArea',
        name: 'Northern Territory',
        sameAs: 'https://en.wikipedia.org/wiki/Northern_Territory',
      },
    ],
    knowsAbout: [
      'IICRC certifications',
      'water restoration technician',
      'fire and smoke restoration',
      'carpet cleaning technician',
      'applied structural drying',
      'disaster recovery',
      'restoration standards',
      'insurance claims Australia',
      'building restoration',
    ],
    sameAs,
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+61457123005',
      email: 'support@carsi.com.au',
      contactType: 'customer service',
      areaServed: 'AU',
      availableLanguage: 'en-AU',
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
    '@id': 'https://carsi.com.au/#website',
    name,
    url,
    publisher: { '@id': 'https://carsi.com.au/#organization' },
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
  url: string;
  price?: number;
  duration?: string;
  educationalLevel?: string;
  teaches?: string[];
}

function normalizeCoursePrice(price: number | undefined): number | undefined {
  if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) return undefined;
  return Number(price.toFixed(2));
}

function courseOffer(url: string, price: number | undefined) {
  const normalizedPrice = normalizeCoursePrice(price);
  if (normalizedPrice === undefined) return undefined;

  return {
    '@type': 'Offer',
    url,
    price: normalizedPrice,
    priceCurrency: 'AUD',
    availability: 'https://schema.org/InStock',
    category: normalizedPrice === 0 ? 'Free' : 'Paid',
  };
}

function selfPacedCourseInstance(name: string, url: string, duration?: string | null) {
  const instance: Record<string, unknown> = {
    '@type': 'CourseInstance',
    name: `${name} online self-paced course`,
    courseMode: 'online',
    url,
  };
  // Google requires courseWorkload as an ISO-8601 duration; emit it only when a
  // real duration is known, otherwise omit (free text is ignored/flagged).
  if (duration) {
    instance.courseWorkload = `PT${duration}H`;
  }
  return instance;
}

export function CourseSchema({
  name,
  description,
  url,
  price,
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
      '@id': 'https://carsi.com.au/#organization',
      name: 'CARSI',
      url: 'https://carsi.com.au',
    },
    url,
    inLanguage: 'en-AU',
    hasCourseInstance: selfPacedCourseInstance(name, url, duration),
  };

  const offer = courseOffer(url, price);
  if (offer) schema.offers = offer;

  if (price === 0) schema.isAccessibleForFree = true;

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

interface ItemListSchemaProps {
  name: string;
  description?: string;
  items: {
    name: string;
    url: string;
    description?: string;
    price?: number;
    duration?: string | null;
    isFree?: boolean;
  }[];
  itemType?: 'Thing' | 'Course';
}

export function ItemListSchema({
  name,
  description,
  items,
  itemType = 'Thing',
}: ItemListSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    description,
    itemListElement: items.map((item, index) => {
      const offer = courseOffer(item.url, item.price);

      return {
        '@type': 'ListItem',
        position: index + 1,
        item:
          itemType === 'Course'
            ? {
                '@type': 'Course',
                name: item.name,
                description: item.description ?? item.name,
                url: item.url,
                ...(item.isFree !== undefined ? { isAccessibleForFree: item.isFree } : {}),
                ...(offer ? { offers: offer } : {}),
                hasCourseInstance: selfPacedCourseInstance(item.name, item.url, item.duration),
                provider: {
                  '@type': 'EducationalOrganization',
                  '@id': 'https://carsi.com.au/#organization',
                  name: 'CARSI',
                  url: 'https://carsi.com.au',
                },
              }
            : {
                '@type': 'Thing',
                name: item.name,
                url: item.url,
                ...(item.description ? { description: item.description } : {}),
              },
      };
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface EventSchemaProps {
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
  eventStatus?: string;
  ticketUrl?: string;
  isFree?: boolean;
  image?: string;
  eventType?: string;
}

export function EventSchema({
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
}: EventSchemaProps) {
  const schema: Record<string, unknown> = {
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
    const location: Record<string, unknown> = { '@type': 'Place' };
    if (locationName) location.name = locationName;
    const address: Record<string, unknown> = {
      '@type': 'PostalAddress',
      addressCountry: 'AU',
    };
    if (locationAddress) address.streetAddress = locationAddress;
    if (locationCity) address.addressLocality = locationCity;
    if (locationState) address.addressRegion = locationState;
    location.address = address;
    if (locationLat && locationLng) {
      location.geo = {
        '@type': 'GeoCoordinates',
        latitude: locationLat,
        longitude: locationLng,
      };
    }
    schema.location = location;
  } else if (isVirtual) {
    schema.location = {
      '@type': 'VirtualLocation',
      url: url,
    };
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

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface JobPostingSchemaProps {
  title: string;
  description: string;
  companyName: string;
  companyUrl?: string;
  datePosted: string;
  validThrough: string;
  employmentType?: string;
  locationCity?: string;
  locationState?: string;
  isRemote?: boolean;
  salaryMin?: number;
  salaryMax?: number;
  applyUrl?: string;
}

export function JobPostingSchema({
  title,
  description,
  companyName,
  companyUrl,
  datePosted,
  validThrough,
  employmentType = 'FULL_TIME',
  locationCity,
  locationState,
  isRemote = false,
  salaryMin,
  salaryMax,
  applyUrl,
}: JobPostingSchemaProps) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title,
    description,
    hiringOrganization: {
      '@type': 'Organization',
      name: companyName,
      ...(companyUrl && { sameAs: companyUrl }),
    },
    datePosted,
    validThrough,
    employmentType,
    jobLocationType: isRemote ? 'TELECOMMUTE' : undefined,
  };

  if (!isRemote && (locationCity || locationState)) {
    schema.jobLocation = {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'AU',
        ...(locationCity && { addressLocality: locationCity }),
        ...(locationState && { addressRegion: locationState }),
      },
    };
  }

  if (salaryMin || salaryMax) {
    schema.baseSalary = {
      '@type': 'MonetaryAmount',
      currency: 'AUD',
      value: {
        '@type': 'QuantitativeValue',
        unitText: 'YEAR',
        ...(salaryMin && { minValue: salaryMin }),
        ...(salaryMax && { maxValue: salaryMax }),
      },
    };
  }

  if (applyUrl) schema.url = applyUrl;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface NewsArticleSchemaProps {
  headline: string;
  description?: string;
  url: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  authorName?: string;
  publisherName?: string;
  keywords?: string[];
}

export function NewsArticleSchema({
  headline,
  description,
  url,
  image,
  datePublished,
  dateModified,
  authorName,
  publisherName,
  keywords,
}: NewsArticleSchemaProps) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline,
    url,
    inLanguage: 'en-AU',
    publisher: {
      '@type': 'Organization',
      name: publisherName ?? 'CARSI',
      url: 'https://carsi.com.au',
    },
  };

  if (description) schema.description = description;
  if (image) schema.image = image;
  if (datePublished) schema.datePublished = datePublished;
  // Freshness signal: fall back to datePublished when no separate modified date
  // exists (article unchanged since publish — a valid equality per Google).
  if (dateModified ?? datePublished) schema.dateModified = dateModified ?? datePublished;
  if (authorName) {
    schema.author = { '@type': 'Person', name: authorName };
  }
  if (keywords && keywords.length > 0) schema.keywords = keywords.join(', ');

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface ArticleSchemaProps {
  headline: string;
  authorName?: string;
  datePublished?: string;
  dateModified?: string;
  url: string;
  image?: string;
  description?: string;
  keywords?: string[];
  articleSection?: string;
}

export function ArticleSchema({
  headline,
  authorName = 'CARSI',
  datePublished = '2026-06-16',
  dateModified,
  url,
  image,
  description,
  keywords,
  articleSection,
}: ArticleSchemaProps) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${url}#article`,
    headline,
    author: {
      '@type': 'Person',
      name: authorName,
      memberOf: { '@id': 'https://carsi.com.au/#organization' },
    },
    publisher: { '@id': 'https://carsi.com.au/#organization' },
    datePublished,
    dateModified: dateModified ?? datePublished,
    mainEntityOfPage: url,
    url,
    inLanguage: 'en-AU',
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['.article-summary', 'h1 + p', '.faq-answer', '.key-takeaway'],
    },
  };

  if (image) {
    schema.image = image;
  }

  if (description) {
    schema.description = description;
  }

  if (keywords && keywords.length > 0) {
    schema.keywords = keywords.join(', ');
  }

  if (articleSection) {
    schema.articleSection = articleSection;
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ---- Podcast Schema (UNI-72) ----

interface PodcastSeriesSchemaProps {
  name: string;
  description?: string;
  url: string;
  imageUrl?: string;
  author?: string;
  rssUrl?: string;
}

export function PodcastSeriesSchema({
  name,
  description,
  url,
  imageUrl,
  author,
  rssUrl,
}: PodcastSeriesSchemaProps) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'PodcastSeries',
    name,
    url,
    inLanguage: 'en-AU',
  };

  if (description) schema.description = description;
  if (imageUrl) schema.image = imageUrl;
  if (rssUrl) schema.webFeed = rssUrl;
  if (author) {
    schema.author = { '@type': 'Organization', name: author };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface VideoObjectSchemaProps {
  name: string;
  description?: string;
  thumbnailUrl?: string;
  uploadDate?: string; // ISO 8601
  url: string;
  channelName?: string;
  channelUrl?: string;
}

export function VideoObjectSchema({
  name,
  description,
  thumbnailUrl,
  uploadDate,
  url,
  channelName,
  channelUrl,
}: VideoObjectSchemaProps) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name,
    url,
    inLanguage: 'en-AU',
  };

  if (description) schema.description = description;
  if (thumbnailUrl) schema.thumbnailUrl = thumbnailUrl;
  if (uploadDate) schema.uploadDate = uploadDate;

  if (channelName) {
    schema.author = {
      '@type': 'Organization',
      name: channelName,
      ...(channelUrl && { url: channelUrl }),
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
