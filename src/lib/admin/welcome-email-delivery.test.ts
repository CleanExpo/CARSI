import { describe, expect, it } from 'vitest';

import {
  describeWelcomeEmailDelivery,
  describeWelcomeEmailFailure,
  WELCOME_EMAIL_RECOVERY,
  type WelcomeEmailFailureReason,
} from './welcome-email-delivery';

describe('describeWelcomeEmailFailure — one wording for both admin surfaces', () => {
  it('names a distinct cause for every reason the mailer can give', () => {
    const reasons: WelcomeEmailFailureReason[] = [
      'not_configured',
      'send_failed',
      'provider_error',
      'dev_console',
      'unknown',
    ];
    const wordings = reasons.map(describeWelcomeEmailFailure);

    expect(new Set(wordings).size).toBe(reasons.length);
    for (const wording of wordings) expect(wording).not.toMatch(/^\s*$/);
  });

  it('does not conflate a throw with a provider refusal', () => {
    // These two get confused precisely because both read as "the email failed".
    // An operator diagnosing a lockout acts on the difference, so the wording
    // must not let one pass for the other.
    expect(describeWelcomeEmailFailure('send_failed')).toMatch(/before the provider answered/);
    expect(describeWelcomeEmailFailure('provider_error')).toMatch(/provider rejected/);
    expect(describeWelcomeEmailFailure('send_failed')).not.toEqual(
      describeWelcomeEmailFailure('provider_error')
    );
  });

  it('renders something usable for a null reason rather than throwing', () => {
    expect(describeWelcomeEmailFailure(null)).toMatch(/did not complete/);
  });

  it('routes every non-delivery the classifier can produce to real copy', () => {
    // Ties the two halves together: whatever `describeWelcomeEmailDelivery`
    // returns must be renderable. A reason added to one and not the other is
    // exactly how an operator ends up reading `undefined`.
    const results = [
      { sent: false, reason: 'not_configured' } as const,
      { sent: false, reason: 'send_failed' } as const,
      { sent: false, reason: 'provider_error' } as const,
      { sent: true, reason: 'dev_console' } as const,
      { sent: false } as const,
    ];
    for (const result of results) {
      const { delivered, reason } = describeWelcomeEmailDelivery(result);
      expect(delivered).toBe(false);
      expect(describeWelcomeEmailFailure(reason)).toBeTruthy();
      expect(describeWelcomeEmailFailure(reason)).not.toContain('undefined');
    }
  });
});

describe('WELCOME_EMAIL_RECOVERY', () => {
  it('tells the operator to reset rather than re-grant', () => {
    // Re-granting is the instinct and the wrong move: a second comp is refused
    // with 409 already_comped, and would rotate the password afresh if it were
    // not. The line has to say both halves.
    expect(WELCOME_EMAIL_RECOVERY).toMatch(/password reset/i);
    expect(WELCOME_EMAIL_RECOVERY).toMatch(/not grant or comp again/i);
  });
});
