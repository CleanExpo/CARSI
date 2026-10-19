// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WATER_COURSE } from '../../../e2e/catalogue-fixtures';
import { CourseGrid } from './CourseGrid';

vi.mock('@/components/ThemeProvider', () => ({ useTheme: () => ({ theme: 'light' }) }));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  window.history.replaceState(null, '', '/courses#catalogue');
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

const tab = (name: string) =>
  Array.from(container.querySelectorAll<HTMLButtonElement>('[role="tab"]')).find(
    (button) => button.textContent === name
  )!;
const courses = [
  WATER_COURSE,
  { id: 'cec-1', slug: 'cec-1', title: 'CEC class', price_aud: 29, cec_hours: '1' },
];

describe('catalogue tab and address (GP-639)', () => {
  it('writes the tab to ?discipline= when the public catalogue opts in, and clears it for All', () => {
    act(() => root.render(<CourseGrid courses={courses} surface="light" syncTabToUrl />));
    act(() => tab('IICRC CEC').click());
    expect(window.location.search).toBe('?discipline=iicrc-cec');
    expect(window.location.hash).toBe('#catalogue');
    act(() => tab('All').click());
    expect(window.location.search).toBe('');
  });

  it('clears ?discipline= when a visitor who arrived on the CEC link clicks All', () => {
    window.history.replaceState(null, '', '/courses?discipline=iicrc-cec#catalogue');
    act(() =>
      root.render(
        <CourseGrid courses={courses} initialTab="IICRC CEC" surface="light" syncTabToUrl />
      )
    );
    expect(tab('IICRC CEC').getAttribute('aria-selected')).toBe('true');
    act(() => tab('All').click());
    expect(window.location.search).toBe('');
    expect(window.location.hash).toBe('#catalogue');
  });

  it('leaves the address alone by default (dashboard and industry pages)', () => {
    act(() => root.render(<CourseGrid courses={courses} surface="light" />));
    act(() => tab('IICRC CEC').click());
    expect(window.location.search).toBe('');
  });
});
