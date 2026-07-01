import { describe, expect, it } from 'vitest';

import { assertNoVerbatimSource } from './no-verbatim-guard';

const SOURCE =
  'Structural materials should be dried to within four percentage points of a dry standard reference value before reconstruction begins on the affected assembly.';

describe('assertNoVerbatimSource', () => {
  it('blocks an answer that reproduces an 8+ word verbatim run from a source', () => {
    const planted = `In practice we recommend that structural materials should be dried to within four percentage points and then verified.`;
    const result = assertNoVerbatimSource(planted, [SOURCE], 8);
    expect(result.ok).toBe(false);
    expect(result.match).toContain('structural materials should be dried to within four');
  });

  it('passes an original-wording paraphrase of the same source', () => {
    const paraphrase =
      'Aim to bring wet building materials close to the reference dry value — roughly a few points off — before you rebuild.';
    expect(assertNoVerbatimSource(paraphrase, [SOURCE], 8).ok).toBe(true);
  });

  it('allows a short shared run below the n-gram threshold', () => {
    // 7 shared words, threshold 8 → allowed
    const partial = 'Structural materials should be dried to within acceptable limits using calibrated meters.';
    expect(assertNoVerbatimSource(partial, [SOURCE], 8).ok).toBe(true);
  });

  it('ignores punctuation and casing when comparing', () => {
    const sameWords =
      'STRUCTURAL MATERIALS, should be DRIED — to within four percentage points!! (per the note)';
    expect(assertNoVerbatimSource(sameWords, [SOURCE], 8).ok).toBe(false);
  });

  it('returns ok when there are no sources', () => {
    expect(assertNoVerbatimSource(SOURCE, [], 8).ok).toBe(true);
  });

  it('returns ok when the candidate text is shorter than n words', () => {
    expect(assertNoVerbatimSource('Dry it fully.', [SOURCE], 8).ok).toBe(true);
  });

  it('rejects a non-positive n-gram size', () => {
    expect(() => assertNoVerbatimSource('anything', [SOURCE], 0)).toThrow(RangeError);
  });
});
