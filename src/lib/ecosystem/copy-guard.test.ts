import { describe, expect, it } from 'vitest';

import { findCopyViolations } from './copy-guard';
import { ecosystemCopyText } from './products';

/**
 * The /ecosystem page talks about other businesses on CARSI's behalf, so its copy must not
 * borrow their claims or make new ones: no IICRC/CEC standing for a sister product, no
 * superlatives or comparisons, no implied ownership or endorsement, no "coming soon" promise,
 * and Australian spelling. check:au-english cannot see this copy (it reads course JSON only),
 * so the spelling rules live here too.
 *
 * Every term in PLANTED must be flagged: that table is the positive control which proves the
 * scanner can fail. A term that stops being flagged is a hole, not a cleaner page.
 */
const PLANTED: string[] = [
  'Every contractor is IICRC certified.',
  'Earn CEC hours here.',
  'CARSI CEC points count toward NRPG membership.',
  'Includes certification for staff.',
  'An accredited network.',
  'An approved supplier.',
  'Licensed contractors only.',
  'Results guaranteed.',
  'We disrupt the trade.',
  'A revolutionary platform.',
  'This will transform restoration.',
  'We redefine the job.',
  'This will change the direction of the industry.',
  'We set the standard.',
  'We raise the bar.',
  'The only network you need.',
  'The #1 choice.',
  'Number one in Australia.',
  'The leading platform.',
  'The best training.',
  'A premier service.',
  'World-class tools.',
  'Unlike other networks, we care.',
  'Finally, a better way.',
  'A fragmented industry.',
  'The system is broken.',
  'Our sister business.',
  'Our partner network.',
  'The official expo.',
  'Endorsed by insurers.',
  'Coming soon to your area.',
  'Recognised by major insurers.',
  'Pick a color.',
  'No odor left behind.',
  'Good behavior.',
  'Black mold.',
  'A training center.',
  'A trade organization.',
  'We analyze moisture.',
  'Carpet fiber care.',
  'Ten liters of water.',
];

describe('findCopyViolations', () => {
  it.each(PLANTED)('flags: %s', (sentence) => {
    expect(findCopyViolations(sentence).length).toBeGreaterThan(0);
  });

  it.each([
    'We facilitate the matching process only.',
    'Download your certificate from the dashboard.',
    'Colour, odour, mould and centre are spelt the Australian way.',
    'It is in preview, and supplier booking is not open yet.',
  ])('leaves honest wording alone: %s', (sentence) => {
    expect(findCopyViolations(sentence)).toEqual([]);
  });

  it('finds nothing in the live /ecosystem copy', () => {
    const text = ecosystemCopyText();
    expect(text.length).toBeGreaterThan(500);
    expect(findCopyViolations(text)).toEqual([]);
  });
});
