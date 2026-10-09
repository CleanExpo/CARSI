import { afterEach, describe, expect, it } from 'vitest';

import { getCarsiCoachingMonthlyNotifyRecipients } from './carsi-coaching-monthly-notify';

describe('CARSI coaching monthly notify', () => {
  const prev = process.env.CARSI_COACHING_MONTHLY_NOTIFY_EMAIL;

  afterEach(() => {
    if (prev === undefined) delete process.env.CARSI_COACHING_MONTHLY_NOTIFY_EMAIL;
    else process.env.CARSI_COACHING_MONTHLY_NOTIFY_EMAIL = prev;
  });

  it('defaults to Phill when env unset', () => {
    delete process.env.CARSI_COACHING_MONTHLY_NOTIFY_EMAIL;
    expect(getCarsiCoachingMonthlyNotifyRecipients()).toEqual(['phill.mcgurk@gmail.com']);
  });

  it('parses comma-separated override', () => {
    process.env.CARSI_COACHING_MONTHLY_NOTIFY_EMAIL = 'ops@carsi.com.au, phill.mcgurk@gmail.com';
    expect(getCarsiCoachingMonthlyNotifyRecipients()).toEqual([
      'ops@carsi.com.au',
      'phill.mcgurk@gmail.com',
    ]);
  });
});
