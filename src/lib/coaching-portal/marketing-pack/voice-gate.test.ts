import { describe, expect, it } from 'vitest';

import {
  hasMinimumMarketingVoice,
  MARKETING_PROFILE_REQUIRED_MESSAGE,
} from '@/lib/coaching-portal/marketing-pack/voice-gate';

describe('hasMinimumMarketingVoice', () => {
  it('requires trade or business name', () => {
    expect(hasMinimumMarketingVoice({ businessName: '', trade: '', town: '', services: '' })).toBe(
      false
    );
    expect(
      hasMinimumMarketingVoice({ businessName: 'Acme', trade: '', town: 'Perth', services: '' })
    ).toBe(true);
    expect(
      hasMinimumMarketingVoice({
        businessName: '',
        trade: 'Restoration',
        town: '',
        services: '',
      })
    ).toBe(true);
  });

  it('ignores whitespace-only fields', () => {
    expect(
      hasMinimumMarketingVoice({ businessName: '  ', trade: '  ', town: '', services: '' })
    ).toBe(false);
  });

  it('exposes a stable user-facing message', () => {
    expect(MARKETING_PROFILE_REQUIRED_MESSAGE.length).toBeGreaterThan(20);
  });
});
