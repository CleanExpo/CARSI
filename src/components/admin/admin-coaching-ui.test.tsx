// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminCoachingShortcutNav, AdminCoachingWorkflowRail } from './admin-coaching-ui';

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    'aria-current': ariaCurrent,
  }: {
    children: React.ReactNode;
    href: string;
    'aria-current'?: string;
  }) => (
    <a href={href} aria-current={ariaCurrent}>
      {children}
    </a>
  ),
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

describe('admin-coaching-ui', () => {
  it('renders shortcut nav with current page', async () => {
    await act(async () =>
      root.render(<AdminCoachingShortcutNav currentPath="/admin/coaching-members" />)
    );
    expect(container.querySelector('[data-testid="admin-coaching-shortcuts"]')).not.toBeNull();
    expect(
      container.querySelector('a[href="/admin/coaching-members"]')?.getAttribute('aria-current')
    ).toBe('page');
  });

  it('renders workflow rail steps', async () => {
    await act(async () =>
      root.render(
        <AdminCoachingWorkflowRail
          steps={[
            { id: 'a', label: 'Chapter', detail: 'Assigned', status: 'done' },
            { id: 'b', label: 'Brief', detail: 'Ready', status: 'current' },
            { id: 'c', label: 'Plan', detail: 'Draft', status: 'upcoming' },
          ]}
        />
      )
    );
    expect(container.querySelector('[data-testid="admin-coaching-workflow"]')).not.toBeNull();
    expect(container.textContent).toContain('Brief');
  });
});
