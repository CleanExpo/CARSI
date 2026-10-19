// @vitest-environment jsdom
/**
 * Course page CEC truth: with no in-force IICRC approval the page shows no CEC stat, pill or
 * audience line (the live page showed "CEC hours —" beside "Technicians earning IICRC CECs");
 * with one, it shows the earns-hours label built from the approved hours.
 */
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
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

/**
 * Lighthouse heading-order failed on the live course page (18/10/2026): the sidebar "Career
 * opportunities" panel, fetched after load, rendered an <h3> straight after the page <h1>.
 * Mount the page, let that panel load, then walk every heading in document order.
 */
describe('CoursePublicDetail — heading order', () => {
  it('never skips a heading level once the sidebar career panel has loaded', async () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const hubBody = {
      discipline: 'water',
      job_keywords: ['water damage technician'],
      related_disciplines: [],
      pathway_name: 'Water restoration',
    };
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(hubBody), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    // jsdom has no IntersectionObserver; in-view animations only need a no-op.
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() {
          return [];
        }
      }
    );
    const course = {
      slug: 'water-damage-essentials',
      title: 'Water Damage Restoration — Essentials',
      price_aud: '29',
      is_free: false,
      cec_hours: null,
      thumbnailUrl: null,
    };
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(CoursePublicDetail, {
          course,
          designation: null,
          priceLabel: '$29',
          priceNum: 29,
          learningOutcomes: [],
          audienceItems: getCourseAudienceItems(course, null),
        })
      );
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(fetchMock).toHaveBeenCalled();
    expect(container.textContent).toContain('Career opportunities');

    const headings = [...container.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => ({
      level: Number(h.tagName[1]),
      text: (h.textContent ?? '').trim().slice(0, 40),
    }));
    expect(headings[0]?.level).toBe(1);
    const skips = headings
      .filter((h, i) => i > 0 && h.level > headings[i - 1].level + 1)
      .map((h) => `h${h.level} "${h.text}"`);
    expect(skips).toEqual([]);

    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });
});

describe('CoursePublicDetail — review policy beside the public rating (release-gate r4)', () => {
  function renderWithRating(aggregateRating: { ratingValue: number; reviewCount: number } | null) {
    const course = {
      slug: 'water-damage-essentials',
      title: 'Water Damage Restoration — Essentials',
      price_aud: '29',
      is_free: false,
      cec_hours: null,
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
        aggregateRating,
      })
    );
  }

  it('links "How we moderate reviews" right beside the rating', () => {
    const html = renderWithRating({ ratingValue: 5, reviewCount: 1 });
    const at = html.indexOf('>5.0</span>');
    expect(at).toBeGreaterThan(-1);
    // Inside the same short rating line, not somewhere else on the page.
    expect(html.slice(at, at + 400)).toMatch(/<a [^>]*href="\/review-policy"[^>]*>How we moderate reviews<\/a>/);
  });

  it('no rating, no rating line', () => {
    const html = renderWithRating(null);
    expect(html).not.toContain('>5.0</span>');
  });
});
