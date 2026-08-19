import { describe, expect, it } from 'vitest';

import { previewBodyFor } from './public-courses-list';

/**
 * This guard protects paid lesson content. The failure it exists to catch is a non-preview
 * body reaching a logged-out visitor, so the leak cases are asserted explicitly rather than
 * only asserting the happy path.
 */
describe('previewBodyFor', () => {
  const BODY = 'Categories of water and what they mean in the field.';

  it('returns the body for a lesson flagged as preview', () => {
    expect(previewBodyFor({ isPreview: true, contentBody: BODY })).toBe(BODY);
  });

  it('NEVER returns the body of a non-preview lesson', () => {
    expect(previewBodyFor({ isPreview: false, contentBody: BODY })).toBeNull();
    expect(previewBodyFor({ isPreview: false, contentBody: BODY })).not.toBe(BODY);
  });

  it('does not leak a long paid body', () => {
    const paid = 'PAID CONTENT '.repeat(500);
    expect(previewBodyFor({ isPreview: false, contentBody: paid })).toBeNull();
  });

  it('returns null for a preview lesson with no body rather than undefined', () => {
    expect(previewBodyFor({ isPreview: true, contentBody: null })).toBeNull();
  });

  it('treats the flag as the only gate — empty string body on a preview stays empty, not null-coerced to a leak', () => {
    expect(previewBodyFor({ isPreview: true, contentBody: '' })).toBe('');
  });
});
