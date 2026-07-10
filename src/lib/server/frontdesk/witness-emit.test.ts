import crypto from 'node:crypto';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { emitFrontDeskWitness } from './witness-emit';

const SECRET = 'witness-secret-at-least-16-chars';

describe('emitFrontDeskWitness', () => {
  const saved = { url: process.env.WITNESS_URL, secret: process.env.WITNESS_SECRET };
  afterEach(() => {
    vi.restoreAllMocks();
    if (saved.url === undefined) delete process.env.WITNESS_URL;
    else process.env.WITNESS_URL = saved.url;
    if (saved.secret === undefined) delete process.env.WITNESS_SECRET;
    else process.env.WITNESS_SECRET = saved.secret;
  });

  it('is a no-op (no fetch) unless BOTH WITNESS_URL and a usable WITNESS_SECRET are set', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    delete process.env.WITNESS_URL;
    delete process.env.WITNESS_SECRET;
    await emitFrontDeskWitness({ reference: 'REF1', email: 'a@b.co' });

    process.env.WITNESS_URL = 'https://crm/api/webhooks/front-desk';
    await emitFrontDeskWitness({ reference: 'REF1', email: 'a@b.co' }); // secret missing
    process.env.WITNESS_SECRET = 'too-short';
    await emitFrontDeskWitness({ reference: 'REF1', email: 'a@b.co' }); // secret < 16

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('POSTs a signed lead.captured the receiver can verify', async () => {
    type FetchInit = { headers: Record<string, string>; body: string };
    let call: { url: string; init: FetchInit } | null = null;
    const fetchMock = vi.fn(async (url: string, init: FetchInit) => {
      call = { url, init };
      return { ok: true, status: 200 } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);
    process.env.WITNESS_URL = 'https://crm/api/webhooks/front-desk';
    process.env.WITNESS_SECRET = SECRET;

    await emitFrontDeskWitness({ reference: 'REF9', email: 'dana@example.com' }, () => 'T0');

    expect(call!.url).toBe('https://crm/api/webhooks/front-desk');
    expect(call!.init.headers['X-Nexus-Brand']).toBe('carsi');
    expect(call!.init.headers['X-Nexus-Event']).toBe('lead.captured');
    expect(JSON.parse(call!.init.body)).toEqual({
      type: 'lead.captured',
      brand: 'carsi',
      reference: 'REF9',
      occurredAt: 'T0',
      data: { email: 'dana@example.com' },
    });
    // The signature is exactly what the Unite-Group receiver recomputes.
    const expected = crypto.createHmac('sha256', SECRET).update(call!.init.body).digest('base64url');
    expect(call!.init.headers['X-Nexus-Signature']).toBe(expected);
  });

  it('never throws when the witness endpoint fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('ECONNREFUSED');
      }),
    );
    process.env.WITNESS_URL = 'https://crm/api/webhooks/front-desk';
    process.env.WITNESS_SECRET = SECRET;
    await expect(emitFrontDeskWitness({ reference: 'REF1', email: 'a@b.co' })).resolves.toBeUndefined();
  });
});
