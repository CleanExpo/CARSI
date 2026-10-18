/**
 * Industry hero discipline chips. Live on 18/10/2026 every industry page rendered chips such as
 * "AMRT · Applied Microbial Remediation" and "CRT · Carpet Repair & Reinstallation": IICRC
 * discipline acronyms naming what CARSI teaches (CLAUDE.md § CARSI designation rule). The chip
 * shows the plain-English subject only; the `code` stays data for course matching.
 */
import { Droplets } from 'lucide-react';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    createElement('a', { href }, children),
}));

import { IndustryHero } from './IndustryHero';

const CODES = 'WRT ASD AMRT FSRT CCT CRT OCT TCST'.split(' ');

describe('IndustryHero discipline chips', () => {
  it('render the subject label only, never the IICRC acronym', () => {
    const html = renderToStaticMarkup(
      createElement(IndustryHero, {
        icon: Droplets,
        industryName: 'Childcare',
        accentColor: '#e91e63',
        headline: 'Train the crew',
        headlineAccent: 'for childcare',
        description: 'Description.',
        disciplines: CODES.map((code, i) => ({ code, label: `Subject ${i}`, color: '#000' })),
        stats: [],
      })
    );
    for (let i = 0; i < CODES.length; i++) expect(html).toContain(`Subject ${i}`);
    const visible = html.replace(/<[^>]+>/g, ' ');
    for (const code of CODES) expect(visible, code).not.toMatch(new RegExp(`\\b${code}\\b`));
  });
});
