import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { industryHubCards } from './industry-hub';
import {
  agedCareRecommendedSlugs,
  agedCareSearchTopics,
  healthcareRecommendedSlugs,
  healthcareSearchTopics,
  hospitalityRecommendedSlugs,
  hospitalitySearchTopics,
} from './industry-track1-topics';
import {
  facilityManagementContactHref,
  facilityManagementFaqs,
  facilityManagementProofPackHref,
  facilityManagementRecommendedSlugs,
  facilityManagementSearchTopics,
  facilityManagementSiteLinks,
} from './industry-track2';

const DESIGNATION_ACRONYM = /\b(WRT|ASD|AMRT|FSRT|CCT|CRT|OCT|TCST|RRT)\b/;

const ROOT = join(__dirname, '..', '..', '..');
const catalogue = (
  JSON.parse(readFileSync(join(ROOT, 'data', 'seed', 'courses-catalog.json'), 'utf8')) as {
    courses: Array<{ slug: string }>;
  }
).courses;
const catalogueSlugs = new Set(catalogue.map((course) => course.slug));

const track1CourseHrefs = [
  ...healthcareSearchTopics,
  ...agedCareSearchTopics,
  ...hospitalitySearchTopics,
]
  .map((topic) => topic.href)
  .filter((href) => href.startsWith('/courses/'))
  .map((href) => href.replace('/courses/', ''));

const track1Recommended = [
  ...healthcareRecommendedSlugs,
  ...agedCareRecommendedSlugs,
  ...hospitalityRecommendedSlugs,
];

describe('Track 1 industry SEO', () => {
  it('every recommended and topic course slug exists in the catalogue seed', () => {
    for (const slug of [...track1Recommended, ...track1CourseHrefs]) {
      expect(catalogueSlugs.has(slug), slug).toBe(true);
    }
  });

  it('Track 1 selling strings do not brand CARSI courses with IICRC designation acronyms', () => {
    const text = [...healthcareSearchTopics, ...agedCareSearchTopics, ...hospitalitySearchTopics]
      .flatMap((topic) => [topic.title, topic.body, topic.cta])
      .join('\n');
    expect(DESIGNATION_ACRONYM.test(text)).toBe(false);
  });
});

describe('industries hub chips', () => {
  it('lists the facility-management Track 2 path and never prints designation acronyms', () => {
    expect(industryHubCards.some((card) => card.slug === 'facility-management')).toBe(true);
    const chips = industryHubCards.flatMap((card) => card.areas).join('\n');
    expect(DESIGNATION_ACRONYM.test(chips)).toBe(false);
  });
});

describe('Track 2 facility management', () => {
  it('does not claim a named global facility-management client', () => {
    const text = [
      ...facilityManagementSearchTopics.flatMap((topic) => [topic.title, topic.body]),
      ...facilityManagementFaqs.flatMap((item) => [item.question, item.answer]),
    ].join('\n');
    expect(text).not.toMatch(/Sodexo|Compass|CBRE|JLL|ABM/i);
    expect(text).toMatch(/IICRC CEC Accredited/);
    expect(text).not.toMatch(/IICRC CEC courses\b/);
    expect(DESIGNATION_ACRONYM.test(text)).toBe(false);
  });

  it('points managers at published prices, not a live team checkout promise', () => {
    expect(facilityManagementSearchTopics.some((topic) => topic.href === '/pricing')).toBe(true);
  });

  it('closes the enterprise loop: tagged contact, proof-pack, Track 1 sites and live course slugs', () => {
    expect(facilityManagementContactHref).toContain('source=facility-management');
    expect(facilityManagementProofPackHref).toBe('/dashboard/student/credentials');
    expect(facilityManagementSiteLinks.map((item) => item.href)).toEqual([
      '/industries/healthcare',
      '/industries/aged-care',
      '/industries/hospitality',
    ]);
    expect(facilityManagementRecommendedSlugs.length).toBeGreaterThan(8);
    for (const slug of facilityManagementRecommendedSlugs) {
      expect(catalogueSlugs.has(slug), slug).toBe(true);
    }
  });
});
