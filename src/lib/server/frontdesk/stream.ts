/**
 * Front-desk streaming transport (Phase 1).
 *
 * A minimal, dependency-free agent loop over OpenRouter's OpenAI-compatible SSE
 * endpoint: it streams text deltas to the caller and, when the model asks to call
 * a tool, runs the tool (read-only in Phase 1) and streams the grounded follow-up.
 *
 * Kept separate from the tested one-shot `OpenRouterClient` so the streaming path
 * cannot destabilise today's default. Transport lives here; tools live in the
 * registry — the same split `@nexus/front-desk` will extract.
 */

import { executeToolCall, toolsForRequest } from './registry';
import type { FrontDeskMessage, ToolCall } from './types';

const BASE_URL = 'https://openrouter.ai/api/v1';

export interface RunFrontDeskStreamParams {
  apiKey: string;
  model: string;
  messages: FrontDeskMessage[];
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  referer?: string;
  appTitle?: string;
  /** Cap on tool rounds. Phase 1 = 1 (one look-up, then answer). */
  maxToolRounds?: number;
  /** Notified with the tool name when the model calls a tool (for UI status). */
  onToolCall?: (name: string) => void;
}

interface ChatDelta {
  content?: string | null;
  tool_calls?: Array<{
    index: number;
    id?: string;
    type?: 'function';
    function?: { name?: string; arguments?: string };
  }>;
}

/**
 * Stream a front-desk answer as text deltas. Yields the assistant's visible text
 * only; tool calls happen transparently between rounds. Assemble the yielded
 * chunks to obtain the full reply (the caller persists that).
 */
export async function* runFrontDeskStream(
  params: RunFrontDeskStreamParams
): AsyncGenerator<string, void, unknown> {
  const maxRounds = params.maxToolRounds ?? 1;
  const messages: FrontDeskMessage[] = [...params.messages];

  for (let round = 0; round <= maxRounds; round++) {
    // Offer tools only while a tool round is still permitted.
    const offerTools = round < maxRounds;
    const { assembledToolCalls } = yield* streamOneRequest(params, messages, offerTools);

    if (assembledToolCalls.length === 0) {
      return; // Model produced a final answer (already yielded).
    }

    // Record the assistant's tool-call turn, then run each tool and append results.
    messages.push({ role: 'assistant', content: null, tool_calls: assembledToolCalls });
    for (const call of assembledToolCalls) {
      params.onToolCall?.(call.function.name);
      const content = await executeToolCall(call);
      messages.push({ role: 'tool', tool_call_id: call.id, content });
    }
    // Loop: next request has the tool results in context; on the final round
    // `offerTools` is false, so the model must answer in prose.
  }
}

/**
 * One streamed request. Yields text deltas as they arrive and returns any tool
 * calls the model assembled across the stream.
 */
async function* streamOneRequest(
  params: RunFrontDeskStreamParams,
  messages: FrontDeskMessage[],
  offerTools: boolean
): AsyncGenerator<string, { assembledToolCalls: ToolCall[] }, unknown> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${params.apiKey}`,
  };
  if (params.referer) headers['HTTP-Referer'] = params.referer;
  if (params.appTitle) headers['X-Title'] = params.appTitle;

  const body: Record<string, unknown> = {
    model: params.model,
    messages,
    stream: true,
    max_tokens: params.maxTokens ?? 1000,
    temperature: params.temperature ?? 0.72,
  };
  if (offerTools) {
    body.tools = toolsForRequest();
    body.tool_choice = 'auto';
  }

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: params.timeoutMs ? AbortSignal.timeout(params.timeoutMs) : undefined,
  });

  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => '');
    throw new Error(`OpenRouter stream error ${response.status}: ${detail.slice(0, 300)}`);
  }

  // tool_calls arrive as deltas keyed by index; accumulate name + arguments.
  const toolAcc = new Map<number, { id: string; name: string; args: string }>();

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE frames are separated by newlines; process complete lines only.
      let nl: number;
      while ((nl = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line || !line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') continue;

        let parsed: { choices?: Array<{ delta?: ChatDelta }> };
        try {
          parsed = JSON.parse(data);
        } catch {
          continue; // ignore keep-alive / partial fragments
        }
        const delta = parsed.choices?.[0]?.delta;
        if (!delta) continue;

        if (typeof delta.content === 'string' && delta.content.length > 0) {
          yield delta.content;
        }
        if (Array.isArray(delta.tool_calls)) {
          for (const tc of delta.tool_calls) {
            const slot = toolAcc.get(tc.index) ?? { id: '', name: '', args: '' };
            if (tc.id) slot.id = tc.id;
            if (tc.function?.name) slot.name = tc.function.name;
            if (tc.function?.arguments) slot.args += tc.function.arguments;
            toolAcc.set(tc.index, slot);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  const assembledToolCalls: ToolCall[] = [...toolAcc.values()]
    .filter((t) => t.name)
    .map((t, i) => ({
      id: t.id || `call_${i}`,
      type: 'function' as const,
      function: { name: t.name, arguments: t.args || '{}' },
    }));

  return { assembledToolCalls };
}
