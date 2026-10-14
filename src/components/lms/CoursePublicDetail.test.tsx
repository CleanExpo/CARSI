/**
 * Course page CEC truth: with no in-force IICRC approval the page shows no CEC stat, pill or
 * audience line (the live page showed "CEC hours —" beside "Technicians earning IICRC CECs");
 * with one, it shows the earns-hours label built from the approved hours.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/lms/EnrolButton', () => ({ EnrolButton: () => null }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/courses/x',
  useRouter: () => ({ push: () => undefined }),
  useSearchParams: () => new URLSearchParams(),
}));

import { getCourseAudienceItems } from '@/lib/lms/course-audience';

import { CoursePublicDetail, cecEarnsLabel } from './CoursePublicDetail';

function renderCourse(cec_hours: string | null): string {
  const course = {
    slug: 'water-damage-essentials',
    title: 'Water Damage Restoration — Essentials',
    price_aud: '29',
    is_free: false,
    cec_hours,
    thumbnailUrl: null,
  };
  return renderToStaticMarkup(
    createElement(CoursePublicDetail, {
      course,
      designation: null,
      priceLabel: '$29',
      priceNum: 29,
      learningOutcomes: [],
      audienceItems: getCourseAudienceItems(course, null),
    })
  );
}

describe('CoursePublicDetail — CEC', () => {
  it('a course without an approval renders no CEC figure, pill or CEC audience line', () => {
    const html = renderCourse(null);
    expect(html).not.toMatch(/CEC hours/i);
    expect(html).not.toContain('—</p>');
    expect(html).not.toContain('Technicians earning IICRC');
    expect(html).not.toMatch(/Earns \d+ IICRC CEC/);
  });

  it('with an approval, shows the singular earns-hours label and the CEC audience line', () => {
    const n = 1;
    const html = renderCourse(String(n));
    expect(html).toContain(`Earns ${n} IICRC CEC hour`);
    expect(html).not.toContain(`Earns ${n} IICRC CEC hours`);
    expect(html).toContain('Technicians earning IICRC Continuing Education Credits (CECs)');
  });

  it('pluralises hours', () => {
    for (const [n, unit] of [
      [1, 'hour'],
      [2, 'hours'],
    ] as const) {
      expect(cecEarnsLabel(String(n))).toBe(`Earns ${n} IICRC CEC ${unit}`);
    }
  });
});
