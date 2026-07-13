import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

import {
  getAssistantCourseContextText,
  getAssistantDisplayName,
  getAssistantPageFocusContext,
  getAssistantScopeLock,
  getAssistantTagline,
} from '@/lib/server/ai-assistant-context';
import { buildAssistantSystemPrompt } from '@/lib/server/assistant-prompt';
import {
  appendMargotTurn,
  loadMargotHistory,
  margotConversationExists,
} from '@/lib/server/margot-conversation-store';
import { getMargotKnowledgeBaseContext } from '@/lib/server/margot-knowledge-base';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { applyRateLimit, clientIpFrom } from '@/lib/rate-limit';
import { OpenRouterAPIError, OpenRouterClient } from '@/lib/openrouter/client';
import { resolveOpenRouterConfig } from '@/lib/openrouter/provider';
import { margotStreamingEnabled } from '@/lib/server/margot-streaming-flag';
import { margotWriteToolsEnabled } from '@/lib/server/margot-write-tools-flag';
import { runFrontDeskStream } from '@/lib/server/frontdesk/stream';
import type { FrontDeskMessage } from '@/lib/server/frontdesk/types';
import { ACTION_SENTINEL } from '@/lib/frontdesk-protocol';

const FALLBACK_REPLY =
  "I'm not sure how to answer that right now. Please try rephrasing your question.";

export const maxDuration = 60;

const MODEL = resolveOpenRouterConfig().model;
const OPENROUTER_TIMEOUT_MS = 50_000;
const MAX_TOKENS = 1_000;
const CHAT_TEMPERATURE = 0.72;

const CHAT_RATE_LIMIT = 5;
const CHAT_RATE_WINDOW_MS = 60_000;
const CHAT_DAILY_LIMIT = 100;
const CHAT_DAY_WINDOW_MS = 24 * 60 * 60 * 1000;

type ChatTurn = { role: 'user' | 'assistant'; content: string };

type RequestBody = {
  message?: string;
  conversation_id?: string | null;
  history?: ChatTurn[];
  page_context?: { course_slug?: string; lesson_id?: string };
  page_path?: string;
};

const MAX_MESSAGE_LEN = 2_000;
const MAX_HISTORY_TURNS = 24;

function trimHistory(history: ChatTurn[] | undefined): ChatTurn[] {
  if (!Array.isArray(history) || history.length === 0) return [];
  const cleaned: ChatTurn[] = [];
  for (const h of history) {
    if (h?.role !== 'user' && h?.role !== 'assistant') continue;
    const content =
      typeof h.content === 'string' ? h.content.trim().slice(0, MAX_MESSAGE_LEN) : '';
    if (!content) continue;
    cleaned.push({ role: h.role, content });
  }
  return cleaned.slice(-MAX_HISTORY_TURNS);
}

function openRouterErrorResponse(error: unknown): NextResponse {
  if (error instanceof OpenRouterAPIError) {
    if (error.statusCode === 429) {
      return NextResponse.json(
        { detail: 'The assistant is busy right now. Please wait a moment and try again.' },
        { status: 429 }
      );
    }
    console.error('[margot/chat] OpenRouter error:', error.statusCode, error.message);
    return NextResponse.json(
      { detail: 'The assistant is temporarily unavailable. Please try again shortly.' },
      { status: 502 }
    );
  }

  console.error('[margot/chat] request failed:', error);
  return NextResponse.json(
    {
      detail:
        'The assistant is temporarily unavailable due to a network error. Please try again shortly.',
    },
    { status: 502 }
  );
}

export async function POST(request: NextRequest) {
  const { apiKey, configured } = resolveOpenRouterConfig();
  if (!configured) {
    return NextResponse.json(
      {
        detail:
          'Chat assistant is not configured. Ask your administrator to set OPENROUTER_API_KEY in the environment.',
      },
      { status: 503 }
    );
  }

  const ip = clientIpFrom(
    request.headers.get('x-forwarded-for'),
    request.headers.get('x-real-ip')
  );
  const minute = applyRateLimit(`public-chat:${ip}`, CHAT_RATE_LIMIT, CHAT_RATE_WINDOW_MS);
  const rl = minute.ok
    ? applyRateLimit(`public-chat-day:${ip}`, CHAT_DAILY_LIMIT, CHAT_DAY_WINDOW_MS)
    : minute;
  if (!rl.ok) {
    return NextResponse.json(
      { detail: 'Too many requests. Please wait a moment and try again.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000))) },
      }
    );
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON body' }, { status: 400 });
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const incomingConversationId =
    typeof body.conversation_id === 'string' ? body.conversation_id.trim() : '';

  if (!message) {
    return NextResponse.json({ detail: 'Message is required' }, { status: 400 });
  }

  if (message.length > MAX_MESSAGE_LEN) {
    return NextResponse.json({ detail: 'Message is too long.' }, { status: 400 });
  }

  const conversationId = incomingConversationId || randomUUID();
  const claims = await getSessionClaimsFromRequest(request);

  let history: ChatTurn[];
  if (incomingConversationId && (await margotConversationExists(conversationId))) {
    history = await loadMargotHistory(conversationId);
  } else {
    history = trimHistory(body.history);
  }

  let courseContext: string;
  try {
    courseContext = await getAssistantCourseContextText();
  } catch (e) {
    console.error('[margot/chat] course context failed:', e);
    courseContext =
      'Course catalogue could not be loaded. Still help with general IICRC and LMS guidance, and suggest /courses.';
  }

  let pageFocus: string | null = null;
  const pc = body.page_context;
  const courseSlug = typeof pc?.course_slug === 'string' ? pc.course_slug.trim() : '';
  const lessonId = typeof pc?.lesson_id === 'string' ? pc.lesson_id.trim() : '';
  if (courseSlug || lessonId) {
    try {
      pageFocus = await getAssistantPageFocusContext(courseSlug || undefined, lessonId || undefined);
    } catch (e) {
      console.error('[margot/chat] page focus failed:', e);
    }
  }

  const name = getAssistantDisplayName();
  const tagline = getAssistantTagline();
  const scopeLock = getAssistantScopeLock();

  const focusSection = pageFocus
    ? `
--- BEGIN CURRENT PAGE FOCUS (this page only; server-sourced from the database) ---
${pageFocus}
--- END CURRENT PAGE FOCUS ---

When CURRENT PAGE FOCUS is present, prioritise it for questions about "this course", "this lesson", or "here". If focus and catalogue disagree on CEC/discipline for the same slug, prefer the catalogue line for that slug and note the learner should confirm on the course page.
`
    : '';

  const systemContent = buildAssistantSystemPrompt({
    name,
    tagline,
    courseContext,
    focusSection,
    scopeLock,
    knowledgeBaseContext: getMargotKnowledgeBaseContext(),
  });

  const conversationMessages: { role: 'user' | 'assistant'; content: string }[] = history.map(
    (h) => ({ role: h.role, content: h.content })
  );
  conversationMessages.push({ role: 'user', content: message });

  const pagePath =
    typeof body.page_path === 'string' && body.page_path.trim()
      ? body.page_path.trim().slice(0, 512)
      : null;

  const persistTurn = (finalText: string) =>
    appendMargotTurn({
      conversationId,
      userMessage: message,
      assistantMessage: finalText,
      model: MODEL,
      meta: {
        userId: claims?.sub ?? null,
        sourceIp: ip,
        pagePath,
        courseSlug: courseSlug || null,
        lessonId: lessonId || null,
      },
    }).catch((e) => {
      console.error('[margot/chat] failed to persist conversation:', e);
    });

  // AI Front Desk (Phase 1, flag-gated): stream the reply and let the model call
  // read-only tools. Flag off → the unchanged one-shot path below. Any stream
  // failure before the first token falls back to a single non-streamed answer,
  // so the learner always receives a reply.
  if (margotStreamingEnabled()) {
    const fdMessages: FrontDeskMessage[] = [
      { role: 'system', content: systemContent },
      ...conversationMessages.map((m): FrontDeskMessage =>
        m.role === 'user'
          ? { role: 'user', content: m.content }
          : { role: 'assistant', content: m.content }
      ),
    ];
    const encoder = new TextEncoder();
    let assembled = '';
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const delta of runFrontDeskStream({
            apiKey,
            model: MODEL,
            messages: fdMessages,
            maxTokens: MAX_TOKENS,
            temperature: CHAT_TEMPERATURE,
            timeoutMs: OPENROUTER_TIMEOUT_MS,
            referer: 'https://carsi.com.au',
            appTitle: 'CARSI Margot',
            includeWrite: margotWriteToolsEnabled(),
          })) {
            assembled += delta;
            controller.enqueue(encoder.encode(delta));
          }
        } catch (error) {
          console.error('[margot/chat] stream failed:', error);
          if (!assembled) {
            try {
              const fallbackClient = new OpenRouterClient({
                apiKey,
                referer: 'https://carsi.com.au',
                appTitle: 'CARSI Margot',
                timeoutMs: OPENROUTER_TIMEOUT_MS,
              });
              const response = await fallbackClient.chat({
                model: MODEL,
                max_tokens: MAX_TOKENS,
                temperature: CHAT_TEMPERATURE,
                messages: [{ role: 'system', content: systemContent }, ...conversationMessages],
              });
              assembled = OpenRouterClient.extractText(response).trim() || FALLBACK_REPLY;
            } catch {
              assembled = FALLBACK_REPLY;
            }
            controller.enqueue(encoder.encode(assembled));
          }
        } finally {
          controller.close();
          // Strip any confirm-gated action trailer before persisting the turn.
          const persistText = assembled.split(ACTION_SENTINEL)[0].trim() || FALLBACK_REPLY;
          void persistTurn(persistText);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Conversation-Id': conversationId,
        'X-Assistant-Name': name,
        'X-Accel-Buffering': 'no',
      },
    });
  }

  try {
    const client = new OpenRouterClient({
      apiKey,
      referer: 'https://carsi.com.au',
      appTitle: 'CARSI Margot',
      timeoutMs: OPENROUTER_TIMEOUT_MS,
    });
    const response = await client.chat({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      temperature: CHAT_TEMPERATURE,
      messages: [{ role: 'system', content: systemContent }, ...conversationMessages],
    });

    const reply =
      OpenRouterClient.extractText(response).trim() ||
      "I'm not sure how to answer that right now. Please try rephrasing your question.";

    void appendMargotTurn({
      conversationId,
      userMessage: message,
      assistantMessage: reply,
      model: MODEL,
      meta: {
        userId: claims?.sub ?? null,
        sourceIp: ip,
        pagePath,
        courseSlug: courseSlug || null,
        lessonId: lessonId || null,
      },
    }).catch((e) => {
      console.error('[margot/chat] failed to persist conversation:', e);
    });

    return NextResponse.json({
      reply,
      conversation_id: conversationId,
      assistant_name: name,
    });
  } catch (error) {
    return openRouterErrorResponse(error);
  }
}
