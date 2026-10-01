// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CARPET_COURSE,
  NON_WATER_COURSE,
  WATER_COURSE,
  publishedCourseFixture,
} from '../../../e2e/catalogue-fixtures';
import { CourseCard } from './CourseCard';
import { CourseGrid } from './CourseGrid';

vi.mock('@/components/ThemeProvider', () => ({ useTheme: () => ({ theme: 'light' }) }));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

const results = () => container.querySelector<HTMLElement>('section[aria-label="Course results"]')!;
const links = (element: Element, title: string) =>
  Array.from(element.querySelectorAll<HTMLAnchorElement>('a[aria-label]')).filter(
    (link) => link.getAttribute('aria-label') === `View course: ${title}`
  );
const tab = (name: string) =>
  Array.from(container.querySelectorAll<HTMLButtonElement>('[role="tab"]')).find(
    (button) => button.textContent === name
  )!;
const realCourses = [WATER_COURSE, NON_WATER_COURSE, CARPET_COURSE];

describe('catalogue results with real cards and published CI seed fixtures', () => {
  it('rejects the draft carpet course that cannot appear in public CI results', () => {
    expect(() => publishedCourseFixture('carpet-cleaning-technician-fundamentals')).toThrow(
      'must be published'
    );
    expect(() => publishedCourseFixture('missing-course')).toThrow('must be published');
    expect(CARPET_COURSE.slug).toBe('introduction-to-basic-carpet-cleaning-and-drying');
  });

  it('filters actual results independently of promoted cards and restores All', () => {
    const courses = [
      WATER_COURSE,
      ...Array.from({ length: 15 }, (_, i) => ({
        id: `water-${i}`,
        slug: `water-${i}`,
        title: `Water course ${i}`,
        price_aud: 49,
      })),
      NON_WATER_COURSE,
    ];
    act(() =>
      root.render(
        <>
          <aside aria-label="Featured courses">
            <CourseCard course={WATER_COURSE} />
            <CourseCard course={NON_WATER_COURSE} />
          </aside>
          <CourseGrid courses={courses} surface="light" />
        </>
      )
    );
    expect(container.querySelectorAll('section[aria-label="Course results"]')).toHaveLength(1);
    const region = results();
    expect(links(region, WATER_COURSE.title)).toHaveLength(1);
    expect(links(region, NON_WATER_COURSE.title)).toHaveLength(0);
    const rows = region.querySelector<HTMLSelectElement>('select[aria-label="Rows per page"]')!;
    act(() => {
      rows.value = 'all';
      rows.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(links(region, NON_WATER_COURSE.title)).toHaveLength(1);
    expect(links(container, WATER_COURSE.title)).toHaveLength(2);
    // A card really has two same-title headings; its labelled CTA is unique.
    expect(
      Array.from(region.querySelectorAll('h3')).filter(
        (heading) => heading.textContent === NON_WATER_COURSE.title
      )
    ).toHaveLength(2);

    act(() => tab('Water Damage').click());
    expect(tab('Water Damage').getAttribute('aria-selected')).toBe('true');
    expect(links(region, WATER_COURSE.title)).toHaveLength(1);
    expect(links(region, WATER_COURSE.title)[0].getAttribute('href')).toBe(
      `/courses/${WATER_COURSE.slug}`
    );
    expect(links(region, NON_WATER_COURSE.title)).toHaveLength(0);
    expect(links(container.querySelector('aside')!, NON_WATER_COURSE.title)).toHaveLength(1);

    act(() => tab('All').click());
    expect(results()).toBe(region);
    expect(links(region, WATER_COURSE.title)).toHaveLength(1);
    expect(links(region, NON_WATER_COURSE.title)).toHaveLength(1);
  });

  it('keeps loading, published carpet search, empty state and recovery in the same region', () => {
    act(() => root.render(<CourseGrid courses={realCourses} loading surface="light" />));
    const region = results();
    expect(region.getAttribute('aria-busy')).toBe('true');
    expect(links(region, WATER_COURSE.title)).toHaveLength(0);
    act(() => root.render(<CourseGrid courses={realCourses} surface="light" />));
    expect(results()).toBe(region);
    expect(region.getAttribute('aria-busy')).toBe('false');
    expect(links(region, WATER_COURSE.title)).toHaveLength(1);
    const search = container.querySelector<HTMLInputElement>('input[aria-label="Search courses"]')!;
    const query = (value: string) =>
      act(() => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
          search,
          value
        );
        search.dispatchEvent(new Event('input', { bubbles: true }));
      });
    query('Carpet');
    expect(links(region, CARPET_COURSE.title)).toHaveLength(1);
    expect(links(region, CARPET_COURSE.title)[0].getAttribute('href')).toBe(
      `/courses/${CARPET_COURSE.slug}`
    );
    expect(links(region, WATER_COURSE.title)).toHaveLength(0);
    expect(links(region, NON_WATER_COURSE.title)).toHaveLength(0);
    query('No matching course');
    expect(region.querySelectorAll('article')).toHaveLength(0);
    expect(region.textContent).toContain('No courses found for "No matching course"');
    query('');
    expect(links(region, WATER_COURSE.title)).toHaveLength(1);
    expect(links(region, CARPET_COURSE.title)).toHaveLength(1);
    expect(region.textContent).not.toContain('No courses found');
  });
});
