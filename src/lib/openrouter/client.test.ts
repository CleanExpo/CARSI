import { afterEach, describe, expect, it, vi } from 'vitest';

import { OpenRouterAPIError, OpenRouterClient } from './client';

describe('OpenRouterClient.chat', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('resolves normally and extracts the reply text', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { role: 'assistant', content: 'hello' }, finish_reason: 'stop' }],
      }),
    }) as unknown as typeof fetch;

    const client = new OpenRouterClient({ apiKey: 'test-key', timeoutMs: 50 });
    const response = await client.chat({
      model: 'z-ai/glm-5.2',
      messages: [{ role: 'user', content: 'hi' }],
    });

    expect(OpenRouterClient.extractText(response)).toBe('hello');
  });

  it('sends bearer auth, model, and messages in the request body', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { role: 'assistant', content: 'ok' }, finish_reason: 'stop' }] }),
    });
    global.fetch = fetchImpl as unknown as typeof fetch;

    const client = new OpenRouterClient({
      apiKey: 'test-key',
      referer: 'https://carsi.com.au',
      appTitle: 'CARSI Margot',
    });
    await client.chat({
      model: 'z-ai/glm-5.2',
      max_tokens: 900,
      messages: [
        { role: 'system', content: 'sys' },
        { role: 'user', content: 'hi' },
      ],
    });

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(init.headers.Authorization).toBe('Bearer test-key');
    expect(init.headers['HTTP-Referer']).toBe('https://carsi.com.au');
    expect(init.headers['X-Title']).toBe('CARSI Margot');
    const body = JSON.parse(init.body);
    expect(body.model).toBe('z-ai/glm-5.2');
    expect(body.max_tokens).toBe(900);
    expect(body.messages).toEqual([
      { role: 'system', content: 'sys' },
      { role: 'user', content: 'hi' },
    ]);
  });

  it('fails fast with a clear error instead of hanging when the upstream never responds', async () => {
    global.fetch = vi.fn((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'TimeoutError'));
        });
      });
    }) as unknown as typeof fetch;

    const client = new OpenRouterClient({ apiKey: 'test-key', timeoutMs: 30 });

    const start = Date.now();
    await expect(
      client.chat({ model: 'z-ai/glm-5.2', messages: [{ role: 'user', content: 'hi' }] })
    ).rejects.toThrow('OpenRouter API request timed out after 30ms');
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(2000);
  });

  it('throws OpenRouterAPIError with status code on a non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'rate limited',
    }) as unknown as typeof fetch;

    const client = new OpenRouterClient({ apiKey: 'test-key' });

    await expect(
      client.chat({ model: 'z-ai/glm-5.2', messages: [{ role: 'user', content: 'hi' }] })
    ).rejects.toThrow(OpenRouterAPIError);
  });

  it('extractText returns empty string when no choices are present', () => {
    expect(OpenRouterClient.extractText({ choices: [] })).toBe('');
  });
});
