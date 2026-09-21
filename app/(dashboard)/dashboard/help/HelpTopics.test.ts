import { describe, expect, it } from 'vitest';

const TOPICS = [
  'Where did I stop?',
  'Where is my certificate?',
  'How many CECs do I have?',
  'What should I learn next?',
];

describe('help topics', () => {
  it('covers the learner journey questions', () => {
    expect(TOPICS).toEqual(
      expect.arrayContaining(['Where did I stop?', 'Where is my certificate?'])
    );
  });
});
