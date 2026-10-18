// @vitest-environment jsdom
/**
 * The membership hero must stay a usable page without WebGL2: one h1, a working CTA to the plan,
 * a decorative (aria-hidden) canvas, and the fallback state instead of a blank or broken hero.
 */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { MembershipHexHero } from './MembershipHexHero';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('MembershipHexHero', () => {
  it('renders the accessible hero and falls back when WebGL2 is unavailable', () => {
    expect('WebGL2RenderingContext' in window).toBe(false); // jsdom: the real no-WebGL path
    act(() => root.render(createElement(MembershipHexHero, { price: 795 })));

    const section = container.querySelector('section')!;
    expect(section.getAttribute('aria-labelledby')).toBe('membership-hero-title');
    expect(section.dataset.hexState).toBe('fallback');

    const h1s = container.querySelectorAll('h1');
    expect(h1s).toHaveLength(1);
    expect(h1s[0].id).toBe('membership-hero-title');

    const canvas = container.querySelector('canvas')!;
    expect(canvas.getAttribute('aria-hidden')).toBe('true');
    expect(canvas.className).toContain('opacity-0');

    const cta = container.querySelector('a[href="#membership-plan"]');
    expect(cta?.textContent).toMatch(/membership/i);
    expect(container.querySelector('a[href="/courses"]')).not.toBeNull();
    expect(container.textContent).toContain('$795 AUD a year');
    // The interaction hint only appears when the floor is actually animating.
    expect(container.textContent).not.toContain('Move across the floor');
  });
});
