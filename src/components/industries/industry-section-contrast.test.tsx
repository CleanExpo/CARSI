/**
 * Industry page sections, as the server sends them: every text reaches WCAG 2.2 AA contrast.
 *
 * The 01/02/03 stat numerals in the "Why" and add-on sections were slate-300 (#cad5e2) on white
 * and #fafbfc, about 1.5:1. Phill approved darkening them to the site's existing deep blue
 * (#0f5fa8, the brand's darkest text blue) on 19/10/2026. Real contrast via
 * src/test-utils/text-contrast.ts; each section's own background comes from its bg-* class.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Shield } from 'lucide-react';

import { industryAddonContent } from '@/lib/marketing/industry-page-data';
import { contrast, textContrastFailures, tokenRgb } from '@/test-utils/text-contrast';

import { ContractorAddOns } from './ContractorAddOns';
import { IndustryWhySection } from './IndustryWhySection';

const PAGE: [number, number, number] = [255, 255, 255];

const whyHtml = () =>
  renderToStaticMarkup(
    createElement(IndustryWhySection, {
      industryName: 'Data Centres',
      headline: 'Built for',
      headlineAccent: 'uptime protection',
      cards: [1, 2, 3].map((n) => ({
        icon: Shield,
        title: `Card ${n}`,
        description: 'Restoration training for facility teams.',
        color: '#6A1B9A',
      })),
    })
  );

describe('industry section text contrast', () => {
  it('stat numerals: the approved deep blue clears 4.5:1 on both section backgrounds', () => {
    const navy = tokenRgb('[#0f5fa8]')!;
    expect(contrast(navy, tokenRgb('white')!)).toBeGreaterThan(6.4);
    expect(contrast(navy, tokenRgb('[#fafbfc]')!)).toBeGreaterThan(6.2);
  });

  it('stat numerals: the old slate-300 fails (control)', () => {
    const html =
      '<section class="bg-white"><p class="text-[2rem] font-semibold text-slate-300 tabular-nums">01</p></section>';
    expect(textContrastFailures(html, [PAGE])).toEqual(['<p> "01" 1.49:1']);
  });

  it('why section: every text reaches 4.5:1', () => {
    const html = whyHtml();
    expect(html).toContain('>01<');
    expect(textContrastFailures(html, [PAGE])).toEqual([]);
  });

  it.each(Object.keys(industryAddonContent))(
    'add-on section (%s): every text reaches 4.5:1',
    (variant) => {
      const html = renderToStaticMarkup(
        createElement(ContractorAddOns, { variant: variant as keyof typeof industryAddonContent })
      );
      expect(html).toContain('>01<');
      expect(textContrastFailures(html, [PAGE])).toEqual([]);
    }
  );
});
