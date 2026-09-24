/**
 * Direct Anthropic Messages API client for admin course-content optimisation.
 * Uses ANTHROPIC_API_KEY only — not the OpenRouter boot-critical path.
 */

export class AnthropicAPIError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(`Anthropic API Error (${statusCode}): ${message}`);
    this.name = 'AnthropicAPIError';
    this.statusCode = statusCode;
  }
}

export function resolveAnthropicConfig(env: NodeJS.ProcessEnv = process.env): {
  configured: boolean;
  apiKey: string;
  model: string;
  baseUrl: string;
} {
  const apiKey = (env.ANTHROPIC_API_KEY ?? '').trim();
  const model =
    (env.ANTHROPIC_OPTIMIZE_MODEL ?? env.ANTHROPIC_MODEL ?? '').trim() || 'claude-sonnet-4-6';
  const baseUrl = (env.ANTHROPIC_BASE_URL ?? '').trim() || 'https://api.anthropic.com';
  return { configured: apiKey.length > 0, apiKey, model, baseUrl };
}

export async function anthropicComplete(opts: {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}): Promise<string> {
  const cfg = resolveAnthropicConfig();
  if (!cfg.configured) {
    throw new AnthropicAPIError(503, 'ANTHROPIC_API_KEY is not configured');
  }

  const controller = new AbortController();
  const timeoutMs = opts.timeoutMs ?? 90_000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/v1/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': cfg.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: cfg.model,
        max_tokens: opts.maxTokens ?? 8192,
        temperature: opts.temperature ?? 0.55,
        system: opts.system,
        messages: [{ role: 'user', content: opts.user }],
      }),
      signal: controller.signal,
    });

    const raw = await res.text();
    let parsed: {
      content?: Array<{ type?: string; text?: string }>;
      error?: { message?: string };
    } = {};
    try {
      parsed = JSON.parse(raw) as typeof parsed;
    } catch {
      parsed = {};
    }

    if (!res.ok) {
      throw new AnthropicAPIError(
        res.status,
        parsed.error?.message || raw.slice(0, 400) || res.statusText
      );
    }

    const text = (parsed.content ?? [])
      .filter((b) => b.type === 'text' && typeof b.text === 'string')
      .map((b) => b.text as string)
      .join('\n')
      .trim();
    if (!text) {
      throw new AnthropicAPIError(502, 'Anthropic returned an empty response');
    }
    return text;
  } catch (e) {
    if (e instanceof AnthropicAPIError) throw e;
    if (e instanceof Error && e.name === 'AbortError') {
      throw new AnthropicAPIError(504, `Anthropic request timed out after ${timeoutMs}ms`);
    }
    throw new AnthropicAPIError(502, e instanceof Error ? e.message : 'Anthropic request failed');
  } finally {
    clearTimeout(timer);
  }
}
