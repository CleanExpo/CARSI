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
