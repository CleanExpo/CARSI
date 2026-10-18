// @vitest-environment jsdom
/**
 * The membership sections below the plan: every topic card must land on a real catalogue tab,
 * every image must exist, headings must nest, and the closing call must return to the plan.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/image', () => ({
  default: (props: { src: string; alt: string }) =>
    createElement('img', { src: props.src, alt: props.alt }),
}));

import { CATALOGUE_TOPIC_TABS, resolveDisciplineParam } from '@/lib/catalogue/discipline-param';

import { INSPECTED_IMAGES } from './hex-geometry';

import {
  MEMBERSHIP_STEPS,
  MEMBERSHIP_TOPICS,
  MembershipClosingCta,
  MembershipLibrary,
  MembershipSteps,
} from './MembershipLanding';

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

describe('membership library cards', () => {
  it('link every topic to a real catalogue tab', () => {
    act(() => root.render(createElement(MembershipLibrary)));
    const links = [...container.querySelectorAll<HTMLAnchorElement>('a[data-membership-topic]')];
    expect(links).toHaveLength(MEMBERSHIP_TOPICS.length);
    for (const a of links) {
      const url = new URL(a.getAttribute('href')!, 'https://carsi.com.au');
      expect(url.pathname).toBe('/courses');
      const tab = resolveDisciplineParam(url.searchParams.get('discipline'));
      expect(tab, a.getAttribute('href')!).toBe(a.dataset.membershipTopic);
      expect(CATALOGUE_TOPIC_TABS).toContain(tab);
      expect(['All', 'Recommended']).not.toContain(tab);
    }
  });

  it('do not promise subjects their tab does not hold', () => {
    // Landing review r2: the live Cleaning tab has no upholstery course (checked 18/10/2026).
    const cleaning = MEMBERSHIP_TOPICS.find((t) => t.tab === 'Cleaning')!;
    expect(cleaning.line).not.toMatch(/upholster/i);
  });

  it('use only the inspected, text-free hero-tile crops, or no photo at all', () => {
    // Full-branch reviews: whole course photos carried stray lettering (one read like a discipline
    // acronym), so a card may only reuse a crop the hero's inspection cleared.
    for (const t of MEMBERSHIP_TOPICS) {
      if (t.image === null) continue;
      expect(INSPECTED_IMAGES as readonly string[], t.image).toContain(t.image);
      expect(existsSync(path.join(process.cwd(), 'public', t.image)), t.image).toBe(true);
    }
    expect(MEMBERSHIP_TOPICS.some((t) => t.image !== null)).toBe(true);
  });

  it('nest one h2 with an h3 per card and decorative images', () => {
    act(() => root.render(createElement(MembershipLibrary)));
    expect(container.querySelectorAll('h2')).toHaveLength(1);
    expect(container.querySelectorAll('h3')).toHaveLength(MEMBERSHIP_TOPICS.length);
    for (const img of container.querySelectorAll('img')) expect(img.getAttribute('alt')).toBe('');
  });
});

describe('how it works', () => {
  it('is an ordered list of three steps that carries the real price', () => {
    act(() => root.render(createElement(MembershipSteps, { price: 795 })));
    const items = container.querySelectorAll('ol > li');
    expect(items).toHaveLength(MEMBERSHIP_STEPS.length);
    expect(items).toHaveLength(3);
    expect(container.textContent).toContain('$795 AUD a year, GST included');
    // Landing review r1: no level the catalogue does not publish, and no claim that the PDF alone verifies.
    expect(container.textContent).not.toMatch(/advanced/i);
    expect(container.textContent).not.toMatch(/anyone can verify/i);
    expect(container.textContent).toContain('public verification link');
    expect(container.querySelectorAll('h2')).toHaveLength(1);
    expect(container.querySelectorAll('h3')).toHaveLength(3);
  });
});

describe('closing call', () => {
  it('returns to the plan', () => {
    act(() => root.render(createElement(MembershipClosingCta)));
    expect(container.querySelector('a[href="#membership-plan"]')).not.toBeNull();
    expect(container.querySelectorAll('h2')).toHaveLength(1);
  });
});
