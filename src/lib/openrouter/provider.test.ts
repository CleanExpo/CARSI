import { describe, expect, it } from 'vitest';

import { resolveOpenRouterConfig } from './provider';

/**
 * WS2 (P0-B) AC-4 — one AI provider of record (OpenRouter).
 *
 * `resolveOpenRouterConfig` is the single source of truth for the OpenRouter key,
 * base URL, and model. Pure + dependency-injected (env param) so it needs no
 * mocking — mirrors getElevenLabsEnv / buildCarsiConnectionStatus.
 */
describe('resolveOpenRouterConfig', () => {
  it('reads the API key from OPENROUTER_API_KEY and reports configured', () => {
    const cfg = resolveOpenRouterConfig({ OPENROUTER_API_KEY: 'sk-or-abc' });
    expect(cfg.apiKey).toBe('sk-or-abc');
    expect(cfg.configured).toBe(true);
  });

  it('reports not-configured with an empty key when OPENROUTER_API_KEY is unset', () => {
    const cfg = resolveOpenRouterConfig({});
    expect(cfg.apiKey).toBe('');
    expect(cfg.configured).toBe(false);
  });

  it('treats a whitespace-only key as unset', () => {
    const cfg = resolveOpenRouterConfig({ OPENROUTER_API_KEY: '   ' });
    expect(cfg.apiKey).toBe('');
    expect(cfg.configured).toBe(false);
  });

  it('defaults the base URL to OpenRouter and honours an override', () => {
    expect(resolveOpenRouterConfig({}).baseUrl).toBe('https://openrouter.ai/api/v1');
    expect(
      resolveOpenRouterConfig({ OPENROUTER_BASE_URL: 'https://proxy.example/v1' }).baseUrl,
    ).toBe('https://proxy.example/v1');
  });

  it('defaults the model to DEFAULT_OPENROUTER_MODEL and honours OPENROUTER_MODEL', () => {
    expect(resolveOpenRouterConfig({}).model).toBe('z-ai/glm-5.2');
    expect(resolveOpenRouterConfig({ OPENROUTER_MODEL: 'google/gemma-4-31b-it:free' }).model).toBe(
      'google/gemma-4-31b-it:free',
    );
  });

  it('never leaks the Anthropic key or an api.anthropic.com base URL', () => {
    const cfg = resolveOpenRouterConfig({
      ANTHROPIC_API_KEY: 'sk-ant-should-be-ignored',
      OPENROUTER_API_KEY: 'sk-or-real',
    });
    expect(cfg.apiKey).toBe('sk-or-real');
    expect(cfg.baseUrl).not.toContain('anthropic');
  });
});
