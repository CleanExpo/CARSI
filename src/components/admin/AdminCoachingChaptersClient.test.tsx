// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminCoachingChaptersClient } from './AdminCoachingChaptersClient';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/coaching-chapters',
}));

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe('AdminCoachingChaptersClient', () => {
  it('renders chapter registry table', async () => {
    await act(async () => root.render(<AdminCoachingChaptersClient />));
    expect(container.querySelector('[data-testid="admin-coaching-chapters-table"]')).not.toBeNull();
    expect(container.textContent).toContain('CARSI Business Coaching');
    expect(container.textContent).toContain('demo-us');
  });
});
