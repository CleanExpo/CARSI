/**
 * Mailtrap stream routing (release-gate r3 P1-MAILTRAP-TRANSACTIONAL-STREAM). Mailtrap requires its
 * Bulk Stream (https://bulk.api.mailtrap.io/api) for marketing and promotional mail; transactional
 * course-service mail stays on https://send.api.mailtrap.io/api. The outbound call is captured at
 * fetch, so this checks the real request destination, not a flag.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { sendEmail } from './email';
import { sendReviewRequestEmail } from './review-request-email';
import { sendRecertReminderEmail } from './transactional-email';

const fetchMock = vi.fn();
const saved = { key: process.env.MAILTRAP_API_KEY, dev: process.env.EMAIL_DEV_CONSOLE };

beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue(
    new Response(JSON.stringify({ success: true, message_ids: ['m-1'] }), { status: 200 })
  );
  vi.stubGlobal('fetch', fetchMock);
  process.env.MAILTRAP_API_KEY = 'test-placeholder-not-a-real-key';
  delete process.env.EMAIL_DEV_CONSOLE;
});
afterEach(() => {
  vi.unstubAllGlobals();
  if (saved.key === undefined) delete process.env.MAILTRAP_API_KEY;
  else process.env.MAILTRAP_API_KEY = saved.key;
  if (saved.dev === undefined) delete process.env.EMAIL_DEV_CONSOLE;
  else process.env.EMAIL_DEV_CONSOLE = saved.dev;
});

const hostOf = (call: number) => new URL(String(fetchMock.mock.calls[call]![0])).href;

describe('Mailtrap stream routing', () => {
  it('defaults to the transactional stream', async () => {
    await sendEmail({ to: 'a@example.com', subject: 's', html: '<p>h</p>' });
    expect(hostOf(0)).toBe('https://send.api.mailtrap.io/api/send');
  });

  it('stream "bulk" goes to the Bulk Stream endpoint', async () => {
    await sendEmail({ to: 'a@example.com', subject: 's', html: '<p>h</p>', stream: 'bulk' });
    expect(hostOf(0)).toBe('https://bulk.api.mailtrap.io/api/send');
  });

  it('the review-request email is sent on the Bulk Stream', async () => {
    const res = await sendReviewRequestEmail({
      to: 'learner@example.com',
      userId: 'user-1',
      name: 'Sam',
      courseTitle: 'Water Damage Restoration',
      courseSlug: 'water-damage',
    });
    expect(res.sent).toBe(true);
    expect(hostOf(0)).toBe('https://bulk.api.mailtrap.io/api/send');
  });

  it('a transactional course-service email (recertification reminder) stays on the transactional stream', async () => {
    await sendRecertReminderEmail({
      to: 'learner@example.com',
      name: 'Sam',
      expiryDate: '2026-12-01',
      milestone: 't_minus_30',
      appOrigin: 'https://carsi.com.au',
    });
    expect(hostOf(0)).toBe('https://send.api.mailtrap.io/api/send');
  });
});

describe('onRequestStart marks the provider-request boundary (release-gate r8)', () => {
  it('fires once, immediately before the request; a network failure after it is still reported', async () => {
    const order: string[] = [];
    fetchMock.mockImplementationOnce(async () => {
      order.push('request');
      throw new Error('socket hang up');
    });
    const res = await sendEmail({
      to: 'a@example.com',
      subject: 's',
      html: '<p>h</p>',
      onRequestStart: () => order.push('start'),
    });
    expect(order).toEqual(['start', 'request']);
    expect(res.sent).toBe(false);
  });

  it('does not fire when nothing is requested (not configured, dev console)', async () => {
    const start = vi.fn();
    delete process.env.MAILTRAP_API_KEY;
    await sendEmail({ to: 'a@example.com', subject: 's', html: '<p>h</p>', onRequestStart: start });
    process.env.MAILTRAP_API_KEY = 'test-placeholder-not-a-real-key';
    process.env.EMAIL_DEV_CONSOLE = 'true';
    await sendEmail({ to: 'a@example.com', subject: 's', html: '<p>h</p>', onRequestStart: start });
    expect(start).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
