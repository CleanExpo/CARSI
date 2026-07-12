/**
 * Single source of truth for the OpenRouter provider config (WS2 / P0-B, AC-4).
 *
 * OpenRouter is CARSI's AI provider of record. Every AI caller (Margot, the
 * instructor review-reply drafter, the admin course builder) should resolve its
 * key / base URL / model through here so there is ONE provider, never a second
 * hardcoded `api.anthropic.com` path or a disagreeing env var.
 *
 * Pure + dependency-injected (env param defaults to process.env) so it is unit
 * testable without mutating the environment — mirrors getElevenLabsEnv.
 */
import { DEFAULT_BASE_URL, DEFAULT_OPENROUTER_MODEL } from '@/lib/openrouter/client';

export { DEFAULT_BASE_URL, DEFAULT_OPENROUTER_MODEL };

export type OpenRouterConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
  referer?: string;
  appTitle: string;
  /** True when an API key is present — the caller is safe to make requests. */
  configured: boolean;
};

export function resolveOpenRouterConfig(
  env: NodeJS.ProcessEnv = process.env,
): OpenRouterConfig {
  const apiKey = env.OPENROUTER_API_KEY?.trim() ?? '';
  const baseUrl = env.OPENROUTER_BASE_URL?.trim() || DEFAULT_BASE_URL;
  const model = env.OPENROUTER_MODEL?.trim() || DEFAULT_OPENROUTER_MODEL;
  const referer =
    env.OPENROUTER_REFERER?.trim() || env.NEXT_PUBLIC_FRONTEND_URL?.trim() || undefined;
  const appTitle = env.OPENROUTER_APP_TITLE?.trim() || 'CARSI';

  return {
    apiKey,
    baseUrl,
    model,
    referer,
    appTitle,
    configured: Boolean(apiKey),
  };
}
