import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  isGa4MeasurementProtocolEnabled,
  sendGa4MeasurementProtocolEvent,
  sendGa4PurchaseEvent,
} from './ga4-measurement-protocol';

const ENV_KEYS = ['NEXT_PUBLIC_GA_MEASUREMENT_ID', 'GA4_MEASUREMENT_PROTOCOL_API_SECRET'] as const;
const originalEnv: Record<string, string | undefined> = {};
for (const key of ENV_KEYS) originalEnv[key] = process.env[key];

function setEnv(measurementId?: string, apiSecret?: string) {
  if (measurementId === undefined) delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  else process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = measurementId;

  if (apiSecret === undefined) delete process.env.GA4_MEASUREMENT_PROTOCOL_API_SECRET;
  else process.env.GA4_MEASUREMENT_PROTOCOL_API_SECRET = apiSecret;
}

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
  vi.restoreAllMocks();
});

describe('isGa4MeasurementProtocolEnabled', () => {
  it('is false when both env vars are unset', () => {
    setEnv(undefined, undefined);
    expect(isGa4MeasurementProtocolEnabled()).toBe(false);
  });

  it('is false when only the measurement id is set', () => {
    setEnv('G-TEST123', undefined);
    expect(isGa4MeasurementProtocolEnabled()).toBe(false);
  });

  it('is false when only the api secret is set', () => {
    setEnv(undefined, 'secret-abc');
    expect(isGa4MeasurementProtocolEnabled()).toBe(false);
  });

  it('is true when both are set', () => {
    setEnv('G-TEST123', 'secret-abc');
    expect(isGa4MeasurementProtocolEnabled()).toBe(true);
  });
});

describe('sendGa4MeasurementProtocolEvent', () => {
  it('no-ops (does not call fetch) when unconfigured', async () => {
    setEnv(undefined, undefined);
    const fetchImpl = vi.fn();
    const result = await sendGa4MeasurementProtocolEvent(
      { name: 'purchase', clientId: 'abc', params: {} },
      { fetchImpl },
    );
    expect(result).toEqual({ sent: false });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('posts to the Measurement Protocol endpoint with measurement_id + api_secret when configured', async () => {
    setEnv('G-TEST123', 'secret-abc');
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 204 });

    const result = await sendGa4MeasurementProtocolEvent(
      {
        name: 'purchase',
        clientId: 'client-1',
        userId: 'user-1',
        params: { currency: 'AUD', value: 199 },
      },
      { fetchImpl },
    );

    expect(result).toEqual({ sent: true, status: 204 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toContain('measurement_id=G-TEST123');
    expect(url).toContain('api_secret=secret-abc');
    const body = JSON.parse(init.body);
    expect(body.client_id).toBe('client-1');
    expect(body.user_id).toBe('user-1');
    expect(body.events).toEqual([{ name: 'purchase', params: { currency: 'AUD', value: 199 } }]);
  });

  it('returns sent:false and does not throw when fetch rejects', async () => {
    setEnv('G-TEST123', 'secret-abc');
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network down'));

    const result = await sendGa4MeasurementProtocolEvent(
      { name: 'purchase', clientId: 'client-1', params: {} },
      { fetchImpl },
    );

    expect(result).toEqual({ sent: false });
  });

  it('returns sent:false when GA4 responds with a non-2xx status', async () => {
    setEnv('G-TEST123', 'secret-abc');
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 400 });

    const result = await sendGa4MeasurementProtocolEvent(
      { name: 'purchase', clientId: 'client-1', params: {} },
      { fetchImpl },
    );

    expect(result).toEqual({ sent: false, status: 400 });
  });
});

describe('sendGa4PurchaseEvent', () => {
  it('no-ops when unconfigured', async () => {
    setEnv(undefined, undefined);
    const fetchImpl = vi.fn();
    const result = await sendGa4PurchaseEvent({
      clientId: 'client-1',
      courseSlug: 'water-damage-101',
      valueAud: 199,
      transactionId: 'cs_test_123',
    });
    expect(result).toEqual({ sent: false });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('sends a purchase event with course slug + value + AUD currency', async () => {
    setEnv('G-TEST123', 'secret-abc');
    const originalFetch = global.fetch;
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    global.fetch = fetchImpl as unknown as typeof fetch;

    try {
      const result = await sendGa4PurchaseEvent({
        clientId: 'client-1',
        userId: 'user-1',
        courseSlug: 'water-damage-101',
        valueAud: 199,
        transactionId: 'cs_test_123',
      });

      expect(result).toEqual({ sent: true, status: 204 });
      const [, init] = fetchImpl.mock.calls[0];
      const body = JSON.parse(init.body);
      expect(body.events[0]).toEqual({
        name: 'purchase',
        params: {
          currency: 'AUD',
          value: 199,
          transaction_id: 'cs_test_123',
          course_slug: 'water-damage-101',
          items: [{ item_id: 'water-damage-101', item_name: 'water-damage-101' }],
        },
      });
    } finally {
      global.fetch = originalFetch;
    }
  });
});
