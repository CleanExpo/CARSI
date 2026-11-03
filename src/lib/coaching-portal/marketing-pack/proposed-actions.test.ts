import { describe, expect, it } from 'vitest';

import { buildLocalSearchChecklist } from './local-search-checklist';
import { decideCoachReview, fixesToProposedActions } from './proposed-actions';
import { reviewWebsite } from './site-review';

const voice = {
  businessName: 'Downs Carpet Care',
  trade: 'Carpet & upholstery',
  town: 'Toowoomba',
  services: 'Carpet cleaning',
};

const review = reviewWebsite({
  websiteUrl: 'http://example-carpets.test/',
  fetch: {
    ok: true,
    status: 200,
    html: '<html><head><title>Home</title></head><body></body></html>',
  },
  googleBusinessUrl: null,
  voice,
});

describe('fixesToProposedActions', () => {
  it('turns every ranked fix into a proposed action keyed for de-duplication', () => {
    const actions = fixesToProposedActions(review.fixes);
    expect(actions).toHaveLength(review.fixes.length);
    actions.forEach((a, i) => {
      expect(a.status).toBe('proposed');
      expect(a.goalId).toBe(`marketing-pack:${review.fixes[i].id}`);
      expect(a.sortOrder).toBe(i);
      expect(a.title.length).toBeLessThanOrEqual(500);
      expect(['high', 'medium', 'low']).toContain(a.priority);
    });
  });
});

describe('decideCoachReview', () => {
  it('approving a proposed action moves it to the member to-do list', () => {
    expect(decideCoachReview('proposed', 'approve')).toEqual({ ok: true, status: 'todo' });
  });

  it('declining a proposed action marks it declined', () => {
    expect(decideCoachReview('proposed', 'decline')).toEqual({ ok: true, status: 'declined' });
  });

  it.each(['todo', 'in_progress', 'done', 'blocked', 'declined'])(
    'refuses to review an action that is already %s',
    (status) => {
      expect(decideCoachReview(status, 'approve').ok).toBe(false);
    }
  );
});

describe('buildLocalSearchChecklist', () => {
  it('lists the local-search basics and ticks the ones the review saw passing', () => {
    const items = buildLocalSearchChecklist(review, voice);
    expect(items.length).toBeGreaterThanOrEqual(8);
    const gbp = items.find((i) => i.id === 'gbp-claimed');
    expect(gbp?.done).toBe(false);
    expect(items.map((i) => i.label).join(' ')).toMatch(/Toowoomba/);
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
  });
});
