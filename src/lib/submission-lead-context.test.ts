import { describe, expect, it } from 'vitest';

import {
  buildSubmissionFormDefaults,
  buildSubmissionLeadContext,
} from './submission-lead-context';

describe('submission-lead-context', () => {
  it('builds professional directory lead context from query params', () => {
    expect(
      buildSubmissionLeadContext({
        source: 'professional-directory',
        intent: 'directory-profile',
      })
    ).toEqual({
      source: 'professional-directory',
      intent: 'directory-profile',
      pageUrl: '/professional-directory',
    });
  });

  it('prefills professional directory description', () => {
    const defaults = buildSubmissionFormDefaults('professional', {
      source: 'professional-directory',
      intent: 'directory-profile',
      pageUrl: '/professional-directory',
    });
    expect(defaults.submission_description).toContain('NRPG-verified');
  });
});
