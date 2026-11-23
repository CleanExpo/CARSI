/**
 * GP-537: homepage CEC figures, as the server sends them.
 *
 * Read 31/08/2026, the live hero showed "CEC progress 14.5 / 20 hrs". That was a static mock-up
 * (HeroTrainingInfographic, added in 95077821, removed by #913), not learner tracking. 20 is not
 * the IICRC renewal figure the learner tracker uses (RENEWAL_CEC_REQUIRED, GP-655). The real
 * per-learner target lives in the learner dashboard, so homepage mock-ups show no CEC target at
 * all.
 *
 * The how-it-works ledger mock-up also read a hard-coded "14.0 hours logged" over rows adding to
 * 6.0. Its total must be the sum of the rows it shows.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) =>
    createElement('a', { href, ...rest }, children),
}));

// Reduced motion renders the counter's final value on the server (no count-up from 0).
vi.mock('framer-motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('framer-motion')>()),
  useReducedMotion: () => true,
}));

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** "14.5 / 20 hrs", "6/14 CECs", "of 20 hours", "20-hour target": any earned-over-target figure. */
const CEC_TARGET =
  /\d+(?:\.\d+)?\s*\/\s*\d+(?:\.\d+)?\s*(?:hrs?|hours?|CECs?)\b|\bof\s+\d+(?:\.\d+)?\s*(?:hrs?|hours?|CECs?)\b|\d+(?:\.\d+)?[- ]hour\s+(?:renewal\s+)?target/i;

async function homepageMockupText(): Promise<string> {
  const { AnimatedHero } = await import('./AnimatedHero');
  const { HomeHowItWorksSection } = await import('./HomeHowItWorksSection');
  return [
    text(renderToStaticMarkup(createElement(AnimatedHero, { benefits: [] }))),
    text(renderToStaticMarkup(createElement(HomeHowItWorksSection))),
  ].join(' ');
}

describe('homepage CEC figures (GP-537)', () => {
  it('the target pattern catches the 31/08/2026 hero figure (the check can fail)', () => {
    expect('CEC progress 14.5 / 20 hrs').toMatch(CEC_TARGET);
    expect('6.0 / 14 CECs').toMatch(CEC_TARGET);
    expect('toward the 20-hour renewal target').toMatch(CEC_TARGET);
    expect('6.0 hours logged').not.toMatch(CEC_TARGET);
  });

  it('homepage mock-ups show no CEC target figure', async () => {
    const page = await homepageMockupText();
    expect(page).not.toMatch(CEC_TARGET);
  });

  it('the ledger mock-up total is the sum of the rows it shows', async () => {
    const { HomeHowItWorksSection } = await import('./HomeHowItWorksSection');
    const page = text(renderToStaticMarkup(createElement(HomeHowItWorksSection)));

    const total = /(\d+\.\d) hours logged/.exec(page);
    expect(total, 'ledger total').not.toBeNull();
    const rows = [...page.matchAll(/Logged \d{1,2} [A-Z][a-z]{2} (\d+\.\d)/g)].map((m) =>
      Number(m[1])
    );
    expect(rows.length).toBeGreaterThan(0);

    const sum = rows.reduce((a, b) => a + b, 0);
    expect(Number(total![1])).toBeCloseTo(sum, 5);
  });
});
