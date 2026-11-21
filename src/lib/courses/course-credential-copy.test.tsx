// @vitest-environment jsdom
/**
 * GP-748 (founder ruling 21/11/2026, "Drop IICRC entirely"): a course that is not CEC-approved
 * in data/seed/cec-approvals.json must not name the IICRC anywhere on its page, not even
 * "not an IICRC certification". Only an approved course keeps the GP-704 disclaimer.
 *
 * Covered: the credential paragraph and every other text CoursePublicDetail renders, the Course
 * JSON-LD credential, the learning outcomes, and the page wiring (the page must compute the flag
 * from the registry and pass it to both components). Each non-approved catalogue course is
 * rendered, so a template that names the IICRC unconditionally fails here.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/lms/EnrolButton', () => ({ EnrolButton: () => null }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/courses/x',
  useRouter: () => ({ push: () => undefined }),
  useSearchParams: () => new URLSearchParams(),
}));

import { CoursePublicDetail } from '@/components/lms/CoursePublicDetail';
import { CourseSchema, CREDENTIAL_DISCLAIMER } from '@/components/seo/JsonLd';
import { getDesignationForCourseSlug } from '@/lib/designations/registry';
import { getCourseAudienceItems } from '@/lib/lms/course-audience';
import { getApprovedCecSlugs, isCecApprovedCourse } from '@/lib/seed/cec-approvals';

import { getCourseLearningOutcomes } from './course-credential-copy';

const REPO = join(__dirname, '..', '..', '..');
const catalogue = JSON.parse(readFileSync(join(REPO, 'data/seed/courses-catalog.json'), 'utf8')) as {
  courses: { slug: string; title: string }[];
};
const approved = new Set(getApprovedCecSlugs());
const nonApproved = catalogue.courses.filter((c) => !approved.has(c.slug));
const anApproved = catalogue.courses.find((c) => approved.has(c.slug));

function renderPage(slug: string, title: string, cecApproved: boolean, cecHours: string | null = null): string {
  const designation = getDesignationForCourseSlug(slug);
  const course = { slug, title, price_aud: '29', is_free: false, cec_hours: cecHours, thumbnailUrl: null };
  const page = renderToStaticMarkup(
    createElement(CoursePublicDetail, {
      course,
      designation,
      priceLabel: '$29',
      priceNum: 29,
      learningOutcomes: getCourseLearningOutcomes(course, designation, cecApproved),
      audienceItems: getCourseAudienceItems(course, designation),
      cecApproved,
    })
  );
  const schema = renderToStaticMarkup(
    createElement(CourseSchema, {
      name: title,
      description: 'A CARSI course.',
      url: `https://carsi.com.au/courses/${slug}`,
      credentialAwarded: designation?.name ?? 'CARSI credential',
      cecApproved,
    })
  );
  return `${page}\n${schema}`;
}

describe('course page credential wording (GP-748)', () => {
  it('reads the real registry and catalogue (scope floor)', () => {
    expect(approved.size).toBeGreaterThanOrEqual(38);
    expect(nonApproved.length).toBeGreaterThanOrEqual(20);
    expect(isCecApprovedCourse('water-damage-restoration-fundamentals')).toBe(false);
    expect(anApproved && isCecApprovedCourse(anApproved.slug)).toBe(true);
    expect(isCecApprovedCourse(null)).toBe(false);
  });

  it('every non-approved catalogue course renders a page and JSON-LD with no IICRC', () => {
    for (const c of nonApproved) {
      const html = renderPage(c.slug, c.title, isCecApprovedCourse(c.slug));
      expect(html, c.slug).not.toMatch(/iicrc/i);
      expect(html, c.slug).toContain('A CARSI course and a CARSI-issued credential.');
    }
  });

  it('a CEC-approved course keeps the GP-704 disclaimer on the page and in the JSON-LD', () => {
    expect(anApproved).toBeDefined();
    const html = renderPage(anApproved!.slug, anApproved!.title, true);
    expect(html).toContain('not an IICRC certification');
    expect(html).toContain(CREDENTIAL_DISCLAIMER);
  });

  it('the learning outcomes name the IICRC only for an approved course', () => {
    expect(getCourseLearningOutcomes({ cec_hours: null }, null, false).join(' ')).not.toMatch(/iicrc/i);
    expect(getCourseLearningOutcomes({ cec_hours: null }, null).join(' ')).not.toMatch(/iicrc/i);
    expect(getCourseLearningOutcomes({ cec_hours: null }, null, true).join(' ')).toMatch(/not an IICRC certification/);
  });

  // PR #1205 review: the approval flag, not the presence of `cec_hours`, decides every IICRC line.
  // The page sanitises hours upstream today; these pin the helpers so they hold on their own.
  it('CEC hours on a non-approved course name no IICRC, in the outcomes or anywhere on the page', () => {
    expect(getCourseLearningOutcomes({ cec_hours: '2' }, null, false).join(' ')).not.toMatch(/iicrc|CEC/i);
    expect(getCourseLearningOutcomes({ cec_hours: '2' }, null).join(' ')).not.toMatch(/iicrc|CEC/i);
    expect(getCourseLearningOutcomes({ cec_hours: '2' }, null, true).join(' ')).toMatch(/Earn 2 IICRC Continuing Education Credits/);
    const plain = nonApproved[0];
    const html = renderPage(plain.slug, plain.title, false, '2');
    expect(html).not.toMatch(/iicrc/i);
    const html2 = renderPage(anApproved!.slug, anApproved!.title, true, '2');
    expect(html2).toContain('Earns 2 IICRC CEC hours');
  });

  it('the course page computes the flag from the registry and passes it to both components', () => {
    const src = readFileSync(join(REPO, 'app/(public)/courses/[slug]/page.tsx'), 'utf8');
    expect(src).toMatch(/const cecApproved = isCecApprovedCourse\(course\.slug\);/);
    expect(src.match(/cecApproved=\{cecApproved\}/g)?.length).toBe(2);
    expect(src).toMatch(/getCourseLearningOutcomes\(course, designation, cecApproved\)/);
    // No IICRC wording may live in the page template itself; it is owned by the flagged helpers.
    expect(src).not.toMatch(/not an IICRC certification|IICRC does not offer/);
  });
});
