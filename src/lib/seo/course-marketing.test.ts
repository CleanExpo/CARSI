import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  buildCourseFallbackKeywords,
  hasContradictoryPriceClaim,
  resolveCourseMarketingTruth,
  type CourseMarketing,
} from './course-marketing';

interface CatalogueCourse {
  slug: string;
  title: string;
  shortDescription?: string | null;
  description?: string | null;
  priceAud: string;
  isFree: boolean;
  cecHours?: number | null;
}

const ROOT = join(__dirname, '..', '..', '..');
const cardsDirectory = join(ROOT, 'data', 'seo', 'course-cards');
const cardsIndex = JSON.parse(
  readFileSync(join(ROOT, 'data', 'seo', 'course-cards.index.json'), 'utf8'),
) as Record<string, CourseMarketing>;
const catalogue = (
  JSON.parse(readFileSync(join(ROOT, 'data', 'seed', 'courses-catalog.json'), 'utf8')) as {
    courses: CatalogueCourse[];
  }
).courses;
const catalogueBySlug = new Map(catalogue.map((course) => [course.slug, course]));
const cecApprovals = (
  JSON.parse(readFileSync(join(ROOT, 'data', 'seed', 'cec-approvals.json'), 'utf8')) as {
    approvals: unknown[];
  }
).approvals;
const surfaceSlugs = Array.from(
  readFileSync(join(ROOT, 'public', 'llms.txt'), 'utf8').matchAll(/\]\(\/courses\/([^\)]+)\)/g),
  (match) => match[1],
);

const unsafeCard: CourseMarketing = {
  slug: 'paid-course',
  seoTitle: 'Free CARSI Course | CARSI',
  metaDescription: 'Take this training at no cost.',
  imageAlt: 'Australian restoration technician recording site evidence',
  og: {
    title: 'Complimentary restoration training',
    description: 'This enrolment is free.',
  },
  keywords: ['restoration training', 'free drying course', 'Australian course'],
  faq: [
    { q: 'What is included?', a: 'Video lessons and practical checks.' },
    { q: 'What does it cost?', a: 'It is $0 AUD.' },
  ],
  courseJsonLd: {
    '@type': 'Course',
    description: 'A free CARSI course.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'AUD' },
  },
};

const fallbacks = {
  seoTitle: 'Paid Course',
  metaDescription: 'Authoritative paid course description.',
  ogTitle: 'Paid Course | CARSI',
  ogDescription: 'Authoritative paid course description.',
  keywords: ['Paid Course', 'restoration course', 'CARSI'],
  imageAlt: 'Paid Course',
};

function flattenStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(flattenStrings);
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).flatMap(flattenStrings);
  }
  return [];
}

describe('hasContradictoryPriceClaim', () => {
  it.each([
    'Free CARSI course',
    'This training is free.',
    'Free enrolment is available today',
    'Take the course at no cost',
    'Complimentary online access',
    'No payment is required',
    'Only $0 AUD',
  ])('recognises a zero-price commerce assertion: %s', (copy) => {
    expect(hasContradictoryPriceClaim(copy)).toBe(true);
  });

  it.each([
    'Use hands-free operation where the equipment supports it.',
    'Leave the filter free of debris.',
    'Maintain free-flowing air through the duct.',
    'Access is included free with CARSI Pro.',
    'Do not certify a site as disease-free.',
    'Leave the surface free from contamination.',
    'Access is included with CARSI Pro.',
    'Use vacuum freeze-drying for soaked paper.',
  ])('preserves non-commerce or subscription wording: %s', (copy) => {
    expect(hasContradictoryPriceClaim(copy)).toBe(false);
  });
});

describe('resolveCourseMarketingTruth', () => {
  it('falls back per unsafe field while preserving safe authored fields for a paid course', () => {
    const resolved = resolveCourseMarketingTruth({
      marketing: unsafeCard,
      isFree: false,
      priceAud: 49,
      fallback: fallbacks,
    });

    expect(resolved).toMatchObject({
      seoTitle: fallbacks.seoTitle,
      metaDescription: fallbacks.metaDescription,
      imageAlt: unsafeCard.imageAlt,
      og: { title: fallbacks.ogTitle, description: fallbacks.ogDescription },
      keywords: ['restoration training', 'Australian course'],
      faq: [{ q: 'What is included?', a: 'Video lessons and practical checks.' }],
    });
    expect(flattenStrings(resolved).some(hasContradictoryPriceClaim)).toBe(false);
    expect((resolved?.courseJsonLd?.offers as { price?: string } | undefined)?.price).not.toBe('0');
  });

  it.each([
    { isFree: true, priceAud: 49 },
    { isFree: false, priceAud: 0 },
  ])('preserves truthful free wording for authoritative free truth: %j', ({ isFree, priceAud }) => {
    expect(
      resolveCourseMarketingTruth({
        marketing: unsafeCard,
        isFree,
        priceAud,
        fallback: fallbacks,
      }),
    ).toEqual(unsafeCard);
  });

  it('preserves a safe authored card by deep value', () => {
    const safeCard: CourseMarketing = {
      ...unsafeCard,
      seoTitle: 'Paid Course | CARSI',
      metaDescription: 'Australian-produced restoration training.',
      og: { title: 'Paid Course | CARSI', description: 'Evidence-led restoration training.' },
      keywords: ['restoration training', 'Australian course'],
      faq: [{ q: 'Who is this for?', a: 'Australian restoration professionals.' }],
      courseJsonLd: { '@type': 'Course', description: 'Evidence-led restoration training.' },
    };

    expect(
      resolveCourseMarketingTruth({
        marketing: safeCard,
        isFree: false,
        priceAud: 149,
        fallback: fallbacks,
      }),
    ).toEqual(safeCard);
  });

  it('returns null when no marketing card exists', () => {
    expect(
      resolveCourseMarketingTruth({
        marketing: null,
        isFree: false,
        priceAud: 29,
        fallback: fallbacks,
      }),
    ).toBeNull();
  });
});

describe('buildCourseFallbackKeywords', () => {
  const base = {
    title: 'Water Restoration Course',
    designationName: 'CARSI Water Restoration Practitioner',
    disciplineTopic: 'Water Restoration',
  };

  it.each([undefined, null, '', '0', 0, 'not-a-number'])('omits CEC/IICRC wording without positive evidence: %s', (cecHours) => {
    expect(buildCourseFallbackKeywords({ ...base, cecHours })).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/IICRC|CEC/i)]),
    );
  });

  it('allows qualified wording from explicit positive CEC evidence', () => {
    expect(buildCourseFallbackKeywords({ ...base, cecHours: '2' })).toContain(
      'IICRC Continuing Education Credit (CEC) course',
    );
  });
});

describe('current repository truth', () => {
  it('freezes catalogue, surface, card, price, and CEC truth', () => {
    expect(catalogue).toHaveLength(37);
    expect(surfaceSlugs).toHaveLength(24);
    expect(new Set(surfaceSlugs).size).toBe(24);
    expect(readdirSync(cardsDirectory).filter((name) => name.endsWith('.json'))).toHaveLength(25);
    expect(Object.keys(cardsIndex)).toHaveLength(25);
    expect(cecApprovals).toHaveLength(0);
    expect(Object.keys(cardsIndex).filter((slug) => !surfaceSlugs.includes(slug))).toEqual([
      'commercial-floor-care-schools-childcare',
    ]);

    const surfacedCourses = surfaceSlugs.map((slug) => catalogueBySlug.get(slug));
    expect(surfacedCourses.every((course) => course && !course.isFree && Number(course.priceAud) > 0)).toBe(true);
    expect(
      surfacedCourses.reduce<Record<string, number>>((prices, course) => {
        if (!course) return prices;
        prices[course.priceAud] = (prices[course.priceAud] ?? 0) + 1;
        return prices;
      }, {}),
    ).toEqual({ '29': 13, '49': 8, '99': 2, '149': 1 });
  });

  it('keeps every card source and generated index entry in exact parity', () => {
    const sourceCards = Object.fromEntries(
      readdirSync(cardsDirectory)
        .filter((name) => name.endsWith('.json'))
        .sort()
        .map((name) => {
          const card = JSON.parse(readFileSync(join(cardsDirectory, name), 'utf8')) as CourseMarketing;
          return [card.slug, card];
        }),
    );

    expect(sourceCards).toEqual(cardsIndex);
  });

  it('resolves all 24 surfaced paid courses without a commerce contradiction', () => {
    const failures: string[] = [];

    for (const slug of surfaceSlugs) {
      const course = catalogueBySlug.get(slug);
      if (!course) {
        failures.push(`${slug}: missing catalogue truth`);
        continue;
      }
      const description = course.shortDescription ?? course.description?.slice(0, 155) ?? course.title;
      const resolved = resolveCourseMarketingTruth({
        marketing: cardsIndex[slug] ?? null,
        isFree: course.isFree,
        priceAud: course.priceAud,
        fallback: {
          seoTitle: course.title,
          metaDescription: description,
          ogTitle: `${course.title} | CARSI`,
          ogDescription: description,
          keywords: buildCourseFallbackKeywords({ title: course.title, cecHours: course.cecHours }),
          imageAlt: course.title,
        },
      });

      if (resolved && flattenStrings(resolved).some(hasContradictoryPriceClaim)) failures.push(slug);
    }

    expect(failures).toEqual([]);
  });
});
