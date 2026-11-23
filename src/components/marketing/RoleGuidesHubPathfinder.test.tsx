// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';

import { RoleGuidesHubPathfinder } from './RoleGuidesHubPathfinder';

describe('RoleGuidesHubPathfinder', () => {
  it('renders three path cards with analytics attributes', () => {
    const mount = document.createElement('div');
    document.body.appendChild(mount);
    const root = createRoot(mount);
    act(() => {
      root.render(createElement(RoleGuidesHubPathfinder));
    });
    expect(document.querySelector('[data-testid="role-guides-pathfinder"]')).toBeTruthy();
    const withEvent = document.querySelectorAll('[data-carsi-event]');
    expect(withEvent.length).toBeGreaterThanOrEqual(3);
    expect(
      Array.from(withEvent).some((el) =>
        (el.getAttribute('data-carsi-context') ?? '').includes('pathfinder')
      )
    ).toBe(true);
  });
});