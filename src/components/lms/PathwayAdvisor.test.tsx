/**
 * Review of fix/industry-faq-licence round 2 (18/10/2026): the public pathway advisor on
 * /pathways rendered each option's recommendedDisciplines as pills printing the raw code
 * ("WRT", "ASD", "AMRT"), branding CARSI course recommendations with IICRC acronyms. The codes
 * are routing data only; the advisor must print plain-English subjects.
 *
 * Renders the real advisor with each option selected and checks what reaches the markup.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { pathwayAdvisorOptions } from '@/lib/customer-journey-loop';
import { ALL_IICRC_CODES, IICRC_DISCIPLINE_SHORT } from '@/lib/iicrc-discipline-display';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    createElement('a', { href }, children),
}));

const CODE = new RegExp(`\\b(?:${ALL_IICRC_CODES})\\b`);

/** Visible text: tags and attribute values removed. */
function visibleText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&[a-z#0-9]+;/gi, ' ');
}

async function renderWithSelected(id: string): Promise<string> {
  vi.resetModules();
  vi.doMock('@/lib/customer-journey-loop', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/customer-journey-loop')>();
    const chosen = actual.pathwayAdvisorOptions.find((o) => o.id === id)!;
    return {
      ...actual,
      pathwayAdvisorOptions: [chosen, ...actual.pathwayAdvisorOptions.filter((o) => o !== chosen)],
    };
  });
  const { PathwayAdvisor } = await import('./PathwayAdvisor');
  return renderToStaticMarkup(createElement(PathwayAdvisor));
}

describe('pathway advisor as rendered', () => {
  afterEach(() => {
    vi.doUnmock('@/lib/customer-journey-loop');
  });

  it('advisor: the check can fail (a code in the markup is caught)', () => {
    expect(CODE.test(visibleText('<span>WRT</span>'))).toBe(true);
    expect(CODE.test(visibleText('<span>Water Restoration</span>'))).toBe(false);
  });

  it.each(pathwayAdvisorOptions.map((o) => [o.id, o.recommendedDisciplines] as const))(
    'advisor: option %s prints subjects, never an IICRC code',
    async (id, codes) => {
      const text = visibleText(await renderWithSelected(id));
      expect(text.match(CODE)?.[0] ?? null).toBeNull();
      for (const code of codes) {
        const label = IICRC_DISCIPLINE_SHORT[code];
        if (label) expect(text).toContain(label);
      }
    }
  );
});
