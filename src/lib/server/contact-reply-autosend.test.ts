import { describe, expect, it } from 'vitest';

import { autoSendEnabled } from './contact-reply-autosend';

/**
 * WS5 — the AI contact-reply auto-send self-approval fix. Eligibility is never
 * derived from a caller-supplied verdict (enforced in the route: autoSendEligible
 * is forced false on create). This pins the operator opt-in flag — auto-send is
 * off unless CONTACT_REPLY_AUTOSEND_ENABLED is exactly 'true'.
 */
describe('autoSendEnabled', () => {
  it('is OFF by default (unset / anything but the exact opt-in)', () => {
    expect(autoSendEnabled({})).toBe(false);
    expect(autoSendEnabled({ CONTACT_REPLY_AUTOSEND_ENABLED: 'false' })).toBe(false);
    expect(autoSendEnabled({ CONTACT_REPLY_AUTOSEND_ENABLED: '1' })).toBe(false);
    expect(autoSendEnabled({ CONTACT_REPLY_AUTOSEND_ENABLED: 'yes' })).toBe(false);
  });

  it('is ON only for the exact opt-in value', () => {
    expect(autoSendEnabled({ CONTACT_REPLY_AUTOSEND_ENABLED: 'true' })).toBe(true);
    expect(autoSendEnabled({ CONTACT_REPLY_AUTOSEND_ENABLED: ' TRUE ' })).toBe(true);
  });
});
