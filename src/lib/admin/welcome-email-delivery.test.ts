import { describe, expect, it } from 'vitest';

import {
  describeWelcomeEmailDelivery,
  describeWelcomeEmailFailure,
  welcomeEmailRecovery,
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

describe('welcomeEmailRecovery — the warning must survive both branches', () => {
  it('always says reset, never re-grant', () => {
    // The instinct on a lockout is to grant again. On the CCW path that is
    // refused (409 already_comped); on the yearly path NOTHING refuses it and it
    // rotates the password afresh, deepening the lockout. Both branches carry it
    // because the branch where it matters most is the failure one.
    for (const delivered of [true, false]) {
      const line = welcomeEmailRecovery(delivered);
      expect(line).toMatch(/password reset/i);
      expect(line).toMatch(/not grant or comp again/i);
    }
  });

  it('does not say "if it does not arrive" about a mail that already did not', () => {
    // A single constant could not phrase both, which is exactly why one surface
    // dropped the shared wording and wrote its own without the warning.
    expect(welcomeEmailRecovery(true)).toMatch(/if it does not arrive/i);
    expect(welcomeEmailRecovery(false)).not.toMatch(/if it does not arrive/i);
  });
});
