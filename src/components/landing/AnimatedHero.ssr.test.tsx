/**
 * Home hero, as the server sends it (before any JavaScript runs).
 *
 * LCP: live on 18/10/2026 the hero headline words and lead paragraph were server-rendered at
 * `opacity:0` (+ blur) and only faded in after hydration, so on a throttled phone the largest
 * paint waited 26.5 s for JavaScript (Lighthouse "render delay" 97%). They must be visible in
 * the server HTML; a transform-only entrance is fine.
 *
 * Contrast: Lighthouse color-contrast failed on the hero's dashboard mock-up — 8-11 px labels in
 * slate-300/400 (#cad5e2 / #90a1b9, 1.4-2.6:1) on white and #f6f8fb cards. Text there must use
 * slate-500 or darker.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import {
  contrast,
  hexRgb,
  type RGB,
  textContrastFailures,
  tokenRgb,
} from '@/test-utils/text-contrast';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) =>
    createElement('a', { href, ...rest }, children),
}));

async function heroHtml(): Promise<string> {
  const { AnimatedHero } = await import('./AnimatedHero');
  return renderToStaticMarkup(createElement(AnimatedHero, { benefits: [] }));
}

/**
 * Review of b5c6ae77 (P1-HERO-CONTRAST): the hero caption (12px) and trust list (13px) were
 * slate-500 directly on the light-blue gradient — 4.24, 3.85 and 3.59:1 against its stops, under
 * WCAG 2.2 SC 1.4.3's 4.5:1. The old check only knew one background (#f6f8fb) and missed it.
 *
 * This computes real contrast instead (src/test-utils/text-contrast.ts); text straight on the hero
 * is checked against EVERY stop of the hero gradient read from the rendered HTML. Not modelled:
 * the blurred, translucent aurora glows, whose colour depends on position.
 */
/** The hero's own backdrop, from the rendered HTML: every stop of its gradient. */
export function heroBackdrops(html: string): RGB[] {
  const grad = /bg-\[linear-gradient\(180deg,([^\]]*)\)\]/.exec(html);
  if (!grad) throw new Error('hero gradient not found in the HTML');
  return [...grad[1].matchAll(/#[0-9a-fA-F]{6}/g)].map((s) => hexRgb(s[0]));
}

/** Every hero text against what it sits on; the section's own bg sits under the gradient overlay. */
export const heroTextContrast = (html: string) =>
  textContrastFailures(html, heroBackdrops(html), { ignoreBgOfLabel: 'CARSI homepage hero' });

describe('AnimatedHero server HTML', () => {
  it('renders the headline and lead paragraph visible (no opacity:0 or blur entrance)', async () => {
    const html = await heroHtml();
    const start = html.indexOf('<h1');
    const leadEnd = html.indexOf('</p>', html.indexOf('</h1>'));
    expect(start).toBeGreaterThan(-1);
    expect(leadEnd).toBeGreaterThan(start);
    const lcpRegion = html.slice(start, leadEnd);
    expect(lcpRegion).toContain('CARSI trains Australia');
    expect(lcpRegion).not.toMatch(/opacity:\s*0(?![.\d])/);
    expect(lcpRegion).not.toMatch(/blur\(/);
  });

  it("contrast: matches the review's sRGB figures for slate-500 on the gradient stops", () => {
    const slate500 = tokenRgb('slate-500')!;
    expect(contrast(slate500, [0xe9, 0xf3, 0xfc])).toBeCloseTo(4.24, 1);
    expect(contrast(slate500, [0xcd, 0xe2, 0xf7])).toBeCloseTo(3.59, 1);
    expect(contrast([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5);
  });

  it('contrast: flags small text on the gradient and light text on cards (control)', () => {
    const backdrop =
      '<section aria-label="CARSI homepage hero" class="bg-[#fafbfc]"><div class="bg-[linear-gradient(180deg,#ffffff_0%,#e9f3fc_26%,#d9e9f9_62%,#cde2f7_100%)]"></div><div class="bg-[radial-gradient(closest-side,rgba(36,144,237,0.42),transparent_72%)]"></div>';
    const on = (inner: string) => heroTextContrast(`${backdrop}${inner}</section>`);
    expect(on('<p class="mt-4 text-xs text-slate-500">Free courses included.</p>')).toHaveLength(1);
    expect(
      on('<div class="bg-white"><p class="text-slate-400">Next lesson</p></div>')
    ).toHaveLength(1);
    expect(
      on(
        '<div class="rounded-full bg-[#f6f8fb] text-slate-500"><span class="h-2"></span>carsi.com.au</div>'
      )
    ).toHaveLength(1);
    expect(
      on(
        '<span class="rounded-full bg-gradient-to-br from-[#146fc2] to-[#2490ed] text-[11px] text-white">S</span>'
      )
    ).toHaveLength(1);
    expect(
      on(
        '<h1 class="text-slate-950">CARSI <span class="bg-gradient-to-r from-[#0f5fa8] via-[#2490ed] to-[#38a2f8] bg-clip-text text-transparent">trusts.</span></h1>'
      )
    ).toHaveLength(1);
    expect(on('<p class="mt-4 text-xs text-slate-700">Free courses included.</p>')).toEqual([]);
  });

  it('contrast: every hero text reaches 4.5:1 on each background it can sit on', async () => {
    expect(heroTextContrast(await heroHtml())).toEqual([]);
  });
});
