import { describe, expect, it } from 'vitest';

import { autoSendEnabled, judgeVerdictApproved } from './contact-reply-autosend';

/**
 * WS5 — the AI contact-reply auto-send self-approval fix.
 * - Eligibility is never derived from a caller-supplied verdict (enforced in the
 *   route: autoSendEligible=false on create). These helpers pin the two guards:
 *   the operator opt-in flag, and an exact fail-closed reading of a verdict.
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

describe('judgeVerdictApproved (exact, fail-closed)', () => {
  it('approves only an explicit APPROVE decision', () => {
    expect(judgeVerdictApproved({ verdict: 'approve' })).toBe(true);
    expect(judgeVerdictApproved({ verdict: 'APPROVED' })).toBe(true);
  });

  it('does NOT approve a negative verdict (the old /approve/i substring bug)', () => {
    expect(judgeVerdictApproved({ verdict: 'not approved' })).toBe(false);
    expect(judgeVerdictApproved({ verdict: 'disapprove' })).toBe(false);
    expect(judgeVerdictApproved({ verdict: 'reject' })).toBe(false);
    expect(judgeVerdictApproved(null)).toBe(false);
    expect(judgeVerdictApproved(undefined)).toBe(false);
    expect(judgeVerdictApproved({})).toBe(false);
    // A high score alone never approves — the risky auto-pass is removed.
    expect(judgeVerdictApproved({ score: 99 })).toBe(false);
  });
});
