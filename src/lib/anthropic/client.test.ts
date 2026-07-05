import { afterEach, describe, expect, it, vi } from 'vitest';

import { AnthropicClient } from './client';

describe('AnthropicClient.messages timeout', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('resolves normally when the upstream responds before the timeout', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ type: 'text', text: 'hello' }] }),
    }) as unknown as typeof fetch;

    const client = new AnthropicClient({ apiKey: 'test-key', timeoutMs: 50 });
    const response = await client.messages({ messages: [{ role: 'user', content: 'hi' }] });

    expect(AnthropicClient.extractText(response)).toBe('hello');
  });

  it('fails fast with a clear error instead of hanging when the upstream never responds', async () => {
    // Simulate a hung request: fetch never resolves on its own, but honours the
    // AbortSignal passed to it (exactly like the real DOM fetch does) so the
    // client's own timeout is what ends it — proving the fix actually bounds
    // the wait instead of relying on an external gateway to kill it.
    global.fetch = vi.fn((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'TimeoutError'));
        });
      });
    }) as unknown as typeof fetch;

    const client = new AnthropicClient({ apiKey: 'test-key', timeoutMs: 30 });

    const start = Date.now();
    await expect(
      client.messages({ messages: [{ role: 'user', content: 'hi' }] })
    ).rejects.toThrow('Anthropic API request timed out after 30ms');
    const elapsed = Date.now() - start;

    // Bounded by the configured timeout, not left hanging indefinitely.
    expect(elapsed).toBeLessThan(2000);
  });

  it('passes an AbortSignal on every request so a real hung socket would also be cut off', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [] }),
    });
    global.fetch = fetchImpl as unknown as typeof fetch;

    const client = new AnthropicClient({ apiKey: 'test-key' });
    await client.messages({ messages: [{ role: 'user', content: 'hi' }] });

    const [, init] = fetchImpl.mock.calls[0];
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
});
