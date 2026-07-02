import { describe, expect, it } from 'vitest';

import { buildReviewReplyMessages } from './review-reply-draft';

describe('buildReviewReplyMessages', () => {
  it('includes course, rating and the written review in the user turn', () => {
    const msgs = buildReviewReplyMessages({
      courseTitle: 'Water Damage Restoration',
      rating: 2,
      title: 'Too fast',
      body: 'The drying module moved quickly.',
    });
    expect(msgs).toHaveLength(2);
    expect(msgs[0].role).toBe('system');
    // Australian English + guardrails present in the system prompt.
    expect(msgs[0].content).toMatch(/Australian English/i);
    expect(msgs[0].content).toMatch(/do not promise refunds/i);
    const user = msgs[1].content;
    expect(user).toContain('Water Damage Restoration');
    expect(user).toContain('Rating: 2/5');
    expect(user).toContain('The drying module moved quickly.');
  });

  it('notes a star-only review when there is no body', () => {
    const msgs = buildReviewReplyMessages({
      courseTitle: 'Odour Control',
      rating: 5,
      title: null,
      body: null,
    });
    expect(msgs[1].content).toMatch(/star rating only/i);
  });
});
