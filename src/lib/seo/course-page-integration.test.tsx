import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { hasContradictoryPriceClaim } from './course-marketing';

const courseRepository = vi.hoisted(() => ({
  getPublishedCourseDetailBySlugFromDatabase: vi.fn(),
}));
const reviews = vi.hoisted(() => ({
  getAggregateRating: vi.fn(),
}));

vi.mock('@/lib/server/public-courses-list', () => courseRepository);
vi.mock('@/lib/server/course-reviews', () => reviews);

import CourseDetailPage, { generateMetadata } from '../../../app/(public)/courses/[slug]/page';

const slug = 'air-quality-and-odour-identification-and-deodorisation-essentials';
const paidCourse = {
  id: 'course-seo-truth-test',
  slug,
  title: 'Air Quality and Odour: Identification and Deodorisation Essentials',
  description: 'Australian-produced professional training for restoration technicians.',
  short_description: 'Australian-produced professional training for restoration technicians.',
  price_aud: '29',
  is_free: false,
  level: 'Introductory',
  category: 'Indoor Air Quality',
  iicrc_discipline: null,
  cec_hours: null,
  duration_hours: '1',
  thumbnail_url: null,
  module_count: 1,
  instructor: null,
  intro_video_url: null,
};

function schemaStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(schemaStrings);
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).flatMap(schemaStrings);
  }
  return [];
}

describe('course page SEO truth integration', () => {
  beforeEach(() => {
    process.env.DATABASE_URL = 'postgresql://local-test/not-used';
    courseRepository.getPublishedCourseDetailBySlugFromDatabase.mockResolvedValue(paidCourse);
    reviews.getAggregateRating.mockResolvedValue(null);
  });

  afterEach(() => {
    delete process.env.DATABASE_URL;
    vi.clearAllMocks();
  });

  it('executes generateMetadata with canonical and Twitter/OpenGraph parity after truth resolution', async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ slug }) });

    expect(metadata.title).toBe('Odour Identification & Deodorisation Course | CARSI');
    expect(metadata.description).toBe(paidCourse.short_description);
    expect(metadata.alternates?.canonical).toBe(`https://carsi.com.au/courses/${slug}`);
    expect(metadata.openGraph?.url).toBe(metadata.alternates?.canonical);
    expect(metadata.twitter?.title).toBe(metadata.openGraph?.title);
    expect(metadata.twitter?.description).toBe(metadata.openGraph?.description);
    expect(schemaStrings(metadata).some(hasContradictoryPriceClaim)).toBe(false);
  });

  it('executes the page with exactly one valid, truthful FAQPage JSON-LD schema', async () => {
    const page = await CourseDetailPage({ params: Promise.resolve({ slug }) });
    const html = renderToStaticMarkup(page);
    const schemas = Array.from(
      html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g),
      (match) => JSON.parse(match[1]) as Record<string, unknown>,
    );
    const faqSchemas = schemas.filter((schema) => schema['@type'] === 'FAQPage');

    expect(faqSchemas).toHaveLength(1);
    const [schema] = faqSchemas;
    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('FAQPage');
    const mainEntity = schema.mainEntity as Array<Record<string, unknown>>;
    expect(mainEntity).toHaveLength(3);
    expect(mainEntity.every((entry) => entry['@type'] === 'Question')).toBe(true);
    expect(
      mainEntity.every((entry) => {
        const answer = entry.acceptedAnswer as Record<string, unknown>;
        return typeof entry.name === 'string' && answer?.['@type'] === 'Answer' && typeof answer.text === 'string';
      }),
    ).toBe(true);
    expect(schemaStrings(schema).some(hasContradictoryPriceClaim)).toBe(false);
  });
});
