import { describe, expect, it } from 'vitest';

import { buildLocalSearchChecklist } from './local-search-checklist';
import { reviewWebsite } from './site-review';

describe('review ask follows Google policy (Codex P1, head 22a64240)', () => {
  const voice = { businessName: 'Pipe Co', trade: 'Plumbing', town: 'Ipswich', services: 'Leaks' };
  const review = reviewWebsite({ websiteUrl: null, fetch: null, googleBusinessUrl: null, voice });
  const item = buildLocalSearchChecklist(review, voice).find((i) => i.id === 'reviews-ask');

  it('asks every customer, not only happy ones', () => {
    expect(item).toBeDefined();
    expect(item!.label).toMatch(/every customer/i);
    expect(item!.label).toMatch(/honest/i);
    expect(`${item!.label} ${item!.detail}`).not.toMatch(
      /(ask|every) (\w+ )?happy|positive review|5-star/i
    );
  });
});
