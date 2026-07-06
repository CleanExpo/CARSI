/**
 * Minimal OpenRouter chat-completions client for Margot's public assistant.
 * OpenRouter exposes an OpenAI-compatible /chat/completions endpoint in
 * front of many providers, including free-tier open-weight models.
 */

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterClientConfig {
  apiKey: string;
  baseUrl?: string;
  /** Request timeout in ms — see AnthropicClient's identical fix for why this
   * matters: an unbounded fetch blocks until an external gateway kills it
   * with an opaque 504 instead of a fast, clear error. */
  timeoutMs?: number;
  /** Sent as OpenRouter's recommended attribution headers (HTTP-Referer /
   * X-Title) so usage is attributed to CARSI in OpenRouter's dashboards. */
  referer?: string;
  appTitle?: string;
}

export interface OpenRouterChatRequest {
  model: string;
  messages: OpenRouterMessage[];
  max_tokens?: number;
  temperature?: number;
}

export interface OpenRouterChatResponse {
  choices: Array<{
    message: { role: string; content: string | null };
    finish_reason: string;
  }>;
}

export class OpenRouterAPIError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(`OpenRouter API Error (${statusCode}): ${message}`);
    this.name = 'OpenRouterAPIError';
    this.statusCode = statusCode;
  }
}

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';
// Diagnostic + UX value: shortened from 45s after raising maxDuration to 60s
// had zero effect on live 504s and produced no server-side logs at all,
// suggesting requests may not be completing within a much shorter window
// than expected. A short timeout fails fast with OUR clean error message
// instead of an opaque platform 504, and confirms whether this code path
// is even being reached.
const DEFAULT_TIMEOUT_MS = 15_000;

export class OpenRouterClient {
  private apiKey: string;
  private baseUrl: string;
  private timeoutMs: number;
  private referer?: string;
  private appTitle?: string;

  constructor(config: OpenRouterClientConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.referer = config.referer;
    this.appTitle = config.appTitle;
  }

  async chat(request: OpenRouterChatRequest): Promise<OpenRouterChatResponse> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };
    if (this.referer) headers['HTTP-Referer'] = this.referer;
    if (this.appTitle) headers['X-Title'] = this.appTitle;

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (e) {
      if (e instanceof DOMException && e.name === 'TimeoutError') {
        throw new Error(`OpenRouter API request timed out after ${this.timeoutMs}ms`);
      }
      throw e;
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new OpenRouterAPIError(response.status, detail.slice(0, 400));
    }

    return response.json();
  }

  static extractText(response: OpenRouterChatResponse): string {
    return response.choices?.[0]?.message?.content ?? '';
  }
}

/** Google Gemma 4 (dense 31B instruct), free on OpenRouter — strong
 * instruction-following so Margot honours the strict scope/disclaimer/citation
 * rules in her system prompt, with a 262k context window for her knowledge base.
 * Preferred over the heavily-contended openai/gpt-oss-120b:free, whose free-tier
 * routing queue was long enough to push Margot's chat route into gateway 504s.
 * Override via OPENROUTER_MODEL if OpenRouter's free-tier lineup changes
 * (google/gemma-4-26b-a4b-it:free is a lower-latency fallback). */
export const DEFAULT_OPENROUTER_MODEL = 'google/gemma-4-31b-it:free';
