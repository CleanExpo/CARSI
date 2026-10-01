// @vitest-environment jsdom

import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminPagination } from '@/components/admin/AdminPagination';
import type { CataloguePageSizeChoice } from '@/lib/catalogue-pagination';
import { CataloguePagination } from './CataloguePagination';
import { CourseGrid } from './CourseGrid';
import { prepareCourseOutline } from './CourseDetailOutline';

vi.mock('@/components/ThemeProvider', () => ({ useTheme: () => ({ theme: 'light' }) }));
vi.mock('./CourseCard', () => ({
  CourseCard: ({ course }: { course: { title: string } }) => (
    <article>
      <h3>{course.title}</h3>
    </article>
  ),
}));

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

function select(value: string) {
  const input = container.querySelector('select')!;
  act(() => {
    input.value = value;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

function numberInput(): HTMLInputElement {
  return container.querySelector('input[type="number"]')!;
}

function typeNumber(value: string) {
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
      numberInput(),
      value
    );
    numberInput().dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function CatalogueHarness({ external }: { external: CataloguePageSizeChoice }) {
  const [size, setSize] = useState(external);
  const [previous, setPrevious] = useState(external);
  if (previous !== external) {
    setPrevious(external);
    setSize(external);
  }
  return (
    <CataloguePagination
      page={1}
      pageCount={4}
      pageSize={size}
      start={0}
      end={5}
      total={80}
      onPageChange={() => {}}
      onPageSizeChange={setSize}
    />
  );
}

describe('pagination state transitions', () => {
  it('preserves an admin custom draft until an external page size changes', () => {
    const props = { page: 1, pageCount: 4, onPageChange: vi.fn(), onPageSizeChange: vi.fn() };
    act(() => root.render(<AdminPagination {...props} pageSize={14} />));
    expect(numberInput().value).toBe('14');
    typeNumber('');
    act(() => root.render(<AdminPagination {...props} pageSize={14} />));
    expect(numberInput().value).toBe('');
    act(() => root.render(<AdminPagination {...props} pageSize={17} />));
    expect(numberInput().value).toBe('17');
    act(() => root.render(<AdminPagination {...props} pageSize="all" />));
    expect(numberInput()).toBeNull();
  });

  it('supports all to preset to custom and external changes without losing an open draft', () => {
    act(() => root.render(<CatalogueHarness external="all" />));
    select('12');
    select('custom');
    expect(numberInput().value).toBe('12');
    typeNumber('17');
    act(() => root.render(<CatalogueHarness external={24} />));
    expect(numberInput().value).toBe('17');
    expect(container.querySelector('select')!.value).toBe('custom');
    act(() =>
      numberInput().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    );
    expect(numberInput().value).toBe('17');
    act(() => root.render(<CatalogueHarness external="all" />));
    expect(numberInput()).toBeNull();
    select('24');
    select('custom');
    expect(numberInput().value).toBe('24');
  });

  it('resets catalogue pagination on each topic change, including returning to an earlier topic', () => {
    const courses = Array.from({ length: 30 }, (_, i) => ({
      id: String(i),
      slug: `course-${i}`,
      title: `Water ${String(i).padStart(2, '0')}`,
      price_aud: 49,
    }));
    act(() => root.render(<CourseGrid courses={courses} surface="light" initialSortBy="title" />));
    const nextPage = () =>
      container.querySelector<HTMLButtonElement>('button[aria-label="Next page"]')!;
    act(() => nextPage().click());
    expect(container.querySelector('[aria-current="page"]')?.getAttribute('aria-label')).toBe(
      'Page 2'
    );
    const tab = (name: string) =>
      Array.from(container.querySelectorAll<HTMLButtonElement>('[role="tab"]')).find(
        (button) => button.textContent === name
      )!;
    act(() => tab('Water Damage').click());
    expect(container.querySelector('[aria-current="page"]')?.getAttribute('aria-label')).toBe(
      'Page 1'
    );
    act(() => nextPage().click());
    act(() => tab('All').click());
    expect(container.querySelector('[aria-current="page"]')?.getAttribute('aria-label')).toBe(
      'Page 1'
    );
  });
});

describe('catalogue results region', () => {
  const waterTitle = 'Water Damage Restoration — Essentials';
  const nonWaterTitle = 'Air Quality and Odour: Identification and Deodorisation Essentials';
  const courses = [
    { id: 'water', slug: 'water-essentials', title: waterTitle, price_aud: 49 },
    ...Array.from({ length: 15 }, (_, i) => ({
      id: `water-${i}`,
      slug: `water-${i}`,
      title: `Water course ${i}`,
      price_aud: 49,
    })),
    { id: 'air', slug: 'air-quality', title: nonWaterTitle, price_aud: 49 },
  ];
  const results = () =>
    container.querySelector<HTMLElement>('section[aria-label="Course results"]')!;
  const headings = (element: Element) =>
    Array.from(element.querySelectorAll('h3')).map((node) => node.textContent);
  const tab = (name: string) =>
    Array.from(container.querySelectorAll<HTMLButtonElement>('[role="tab"]')).find(
      (button) => button.textContent === name
    )!;

  it('filters actual results independently of matching promoted courses and restores All', () => {
    act(() =>
      root.render(
        <>
          <aside aria-label="Featured courses">
            <h3>{waterTitle}</h3>
            <h3>{nonWaterTitle}</h3>
          </aside>
          <CourseGrid courses={courses} surface="light" />
        </>
      )
    );
    expect(container.querySelectorAll('section[aria-label="Course results"]')).toHaveLength(1);
    const region = results();
    expect(headings(region)).toContain(waterTitle);
    // Absence on the first page cannot prove that a filter works.
    expect(headings(region)).not.toContain(nonWaterTitle);
    const rows = region.querySelector<HTMLSelectElement>('select[aria-label="Rows per page"]')!;
    act(() => {
      rows.value = 'all';
      rows.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(headings(region)).toContain(nonWaterTitle);
    expect(headings(container).filter((title) => title === waterTitle)).toHaveLength(2);
    expect(headings(container).filter((title) => title === nonWaterTitle)).toHaveLength(2);

    act(() => tab('Water Damage').click());
    expect(tab('Water Damage').getAttribute('aria-selected')).toBe('true');
    expect(headings(region)).toContain(waterTitle);
    expect(headings(region)).not.toContain(nonWaterTitle);
    expect(headings(container.querySelector('aside')!)).toEqual([waterTitle, nonWaterTitle]);

    act(() => tab('All').click());
    expect(results()).toBe(region);
    expect(headings(region)).toContain(waterTitle);
    expect(headings(region)).toContain(nonWaterTitle);
  });

  it('keeps loading, search results and empty states inside the same named region', () => {
    act(() => root.render(<CourseGrid courses={courses} loading surface="light" />));
    const region = results();
    expect(region.getAttribute('aria-busy')).toBe('true');
    expect(headings(region)).toHaveLength(0);
    act(() => root.render(<CourseGrid courses={courses} surface="light" />));
    expect(results()).toBe(region);
    expect(region.getAttribute('aria-busy')).toBe('false');
    const search = container.querySelector<HTMLInputElement>('input[aria-label="Search courses"]')!;
    const query = (value: string) =>
      act(() => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
          search,
          value
        );
        search.dispatchEvent(new Event('input', { bubbles: true }));
      });
    query('Air Quality');
    expect(headings(region)).toEqual([nonWaterTitle]);
    query('No matching course');
    expect(headings(region)).toHaveLength(0);
    expect(region.textContent).toContain('No courses found for "No matching course"');
    query('Water Damage');
    expect(headings(region)).toEqual([waterTitle]);
    expect(region.textContent).not.toContain('No courses found');
  });
});

describe('course outline ordinals', () => {
  it('numbers repeated references and IDs globally and marks only one current lesson', () => {
    const repeated = { id: 'same', title: 'Repeated', completed: false };
    const rows = [
      {
        id: 'first',
        title: 'First',
        lessons: [{ id: 'done', title: 'Done', completed: true }, repeated],
      },
      { id: 'second', title: 'Second', lessons: [repeated, { ...repeated }] },
    ];
    const outline = prepareCourseOutline(rows, true).flatMap((row) => row.lessons);
    expect(outline.map((lesson) => lesson.number)).toEqual([1, 2, 3, 4]);
    expect(outline.map((lesson) => lesson.mark)).toEqual([
      'done',
      'current',
      'upcoming',
      'upcoming',
    ]);
    expect(
      prepareCourseOutline(rows, false)
        .flatMap((row) => row.lessons)
        .some((lesson) => lesson.mark === 'current')
    ).toBe(false);
  });
});
