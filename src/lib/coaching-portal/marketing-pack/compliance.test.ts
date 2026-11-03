import { describe, expect, it } from 'vitest';

import { findComplianceIssues, isCompliantCopy } from './compliance';

describe('findComplianceIssues', () => {
  it.each([
    'Earn $5,000 a week with our system',
    'Make $200k this year',
    'Double your revenue in 30 days',
    'Triple your income',
    'Guaranteed results or your money back',
    'We guarantee a spotless carpet',
    '100% satisfaction every time',
    'Risk-free booking',
    'The number one cleaner in town',
    'Industry-leading service',
    'World-class restoration',
    'The best carpet cleaner in Toowoomba',
    'Cheapest prices on the Downs',
    'Top-rated plumber on the coast',
    'We follow the IICRC standards on every job',
    'Proud iicrc members since 2019',
    'Passive income from every job',
    'Results in 24 hours, every time',
    'Kills 99.9% of mould',
    // Earnings promises without a dollar figure (Codex P1, head 0a953a79).
    'We can help you earn thousands each month from your work.',
    'Bring in hundreds more every week',
    'Grow your income with a cleaner home',
    'Boost your profits this winter',
    'Save you money on every visit',
    'A side hustle that pays',
    // Definite outcome promises without the word "guarantee" (Codex P1, head c3b52247).
    'We promise you will get 10 new customers in 30 days if you book with us.',
    "You'll get more bookings after one visit",
    'You will see results straight away',
    'Get 5 new leads a week',
    'Fully dry in 24 hours',
    '50% fewer callbacks',
    'Your carpets will look brand new',
    'Promised spotless finish',
    // Unqualified result promises in other frequency or result wording (Codex P1, head 95f39114).
    'Our service gets your carpets spotless every visit.',
    'Fresh, clean carpets every job.',
    'Each clean leaves your home stain-free',
    'A flawless finish on your tiles',
    'Perfect results for Toowoomba homes',
    'We remove all stains from your couch',
    'Leaves your rugs odour-free',
    'Completely removes pet odours',
  ])('rejects %s', (text) => {
    expect(findComplianceIssues(text).length).toBeGreaterThan(0);
    expect(isCompliantCopy(text)).toBe(false);
  });

  it.each([
    'Fresh carpets for Toowoomba homes this spring. Book a clean online.',
    'Behind the scenes: how we dry a rug after a deep clean.',
    'Our technicians keep their training up to date.',
    'Ask us how often a family home should have its carpets cleaned.',
    'Earned a five-star review this week. Thanks, Sarah.',
    'Put your phone number at the top of the page.',
    'Put a heading at the top such as "Plumbing in Mackay".',
    'The best way to dry a rug is flat, in the shade.',
    'Blot spills, never rub them.',
    'Every carpet is different, so we test a small patch first.',
    'Ask about stain protection at your next clean.',
  ])('allows %s', (text) => {
    expect(findComplianceIssues(text)).toEqual([]);
  });
});
