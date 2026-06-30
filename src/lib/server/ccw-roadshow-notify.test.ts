import { afterEach, describe, expect, it, vi } from 'vitest';

import { getRoadshowNotifyRecipients } from './ccw-roadshow-notify';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getRoadshowNotifyRecipients', () => {
  it('routes Melbourne to Phill only by default', () => {
    expect(getRoadshowNotifyRecipients('melbourne')).toEqual(['phill.mcgurk@gmail.com']);
  });

  it('routes Sydney to Toby and Phill by default', () => {
    expect(getRoadshowNotifyRecipients('sydney')).toEqual([
      'tobyb@ccwarehouse.com.au',
      'phill.mcgurk@gmail.com',
    ]);
  });

  it('is case- and whitespace-insensitive on the slug', () => {
    expect(getRoadshowNotifyRecipients('  Sydney ')).toEqual([
      'tobyb@ccwarehouse.com.au',
      'phill.mcgurk@gmail.com',
    ]);
  });

  it('returns an empty list for an unknown or missing slug', () => {
    expect(getRoadshowNotifyRecipients('perth')).toEqual([]);
    expect(getRoadshowNotifyRecipients(null)).toEqual([]);
    expect(getRoadshowNotifyRecipients(undefined)).toEqual([]);
  });

  it('lets an env override replace the default recipients', () => {
    vi.stubEnv('CCW_ROADSHOW_NOTIFY_SYDNEY', 'a@example.com, b@example.com');
    expect(getRoadshowNotifyRecipients('sydney')).toEqual(['a@example.com', 'b@example.com']);
  });

  it('ignores an empty/blank env override and falls back to defaults', () => {
    vi.stubEnv('CCW_ROADSHOW_NOTIFY_MELBOURNE', '   ');
    expect(getRoadshowNotifyRecipients('melbourne')).toEqual(['phill.mcgurk@gmail.com']);
  });
});
