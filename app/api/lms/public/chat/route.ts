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
import { getMargotKnowledgeBaseContext } from '@/lib/server/margot-knowledge-base';
import { clientIpFrom } from '@/lib/rate-limit';
import { applyRateLimitDistributed } from '@/lib/rate-limit-distributed';
import { DEFAULT_OPENROUTER_MODEL, OpenRouterClient } from '@/lib/openrouter/client';

const MODEL = process.env.OPENROUTER_MODEL?.trim() || DEFAULT_OPENROUTER_MODEL;

// Public (unauthenticated) endpoint that spends on OpenRouter — cap per IP so a
// bot can't drive unbounded model cost. Best-effort (in-process) limiter.
// Public, unauthenticated, spends on OpenRouter — cap per IP per minute AND per day so
// a bot can't drive unbounded model cost (issue #131): 5/min/IP + 100/day/IP.
const CHAT_RATE_LIMIT = 5;
const CHAT_RATE_WINDOW_MS = 60_000;
const CHAT_DAILY_LIMIT = 100;
const CHAT_DAY_WINDOW_MS = 24 * 60 * 60 * 1000;

type ChatTurn = { role: 'user' | 'assistant'; content: string };

type RequestBody = {
  message?: string;
  conversation_id?: string | null;
  /** Prior turns (excluding the current `message`); max ~12 each side enforced server-side */
  history?: ChatTurn[];
  /** Optional: URL-derived focus so Margot can answer in course/lesson context (validated server-side). */
  page_context?: { course_slug?: string; lesson_id?: string };
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

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        detail:
          'Chat assistant is not configured. Ask your administrator to set OPENROUTER_API_KEY in the environment.',
      },
      { status: 503 }
    );
  }

  // Rate-limit before spending on the model. Keyed per client IP.
  const ip = clientIpFrom(
    request.headers.get('x-forwarded-for'),
    request.headers.get('x-real-ip')
  );
  // Per-minute first; only charge the daily bucket when the minute check passes,
  // so a blocked request doesn't also consume a day-slot.
  const minute = await applyRateLimitDistributed(
    `public-chat:${ip}`,
    CHAT_RATE_LIMIT,
    CHAT_RATE_WINDOW_MS
  );
  const rl = minute.ok
    ? await applyRateLimitDistributed(`public-chat-day:${ip}`, CHAT_DAILY_LIMIT, CHAT_DAY_WINDOW_MS)
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
  const history = trimHistory(body.history);

  let courseContext: string;
  try {
    courseContext = await getAssistantCourseContextText();
  } catch (e) {
    console.error('[lms/public/chat] course context failed:', e);
    courseContext =
      'Course catalogue could not be loaded. Still help with general IICRC and LMS guidance, and suggest /courses.';
  }

  let pageFocus: string | null = null;
  const pc = body.page_context;
  if (pc && typeof pc === 'object') {
    const slug = typeof pc.course_slug === 'string' ? pc.course_slug : undefined;
    const lid = typeof pc.lesson_id === 'string' ? pc.lesson_id : undefined;
    if (slug?.trim() || lid?.trim()) {
      try {
        pageFocus = await getAssistantPageFocusContext(slug, lid);
      } catch (e) {
        console.error('[lms/public/chat] page focus failed:', e);
      }
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

  try {
    const client = new OpenRouterClient({
      apiKey,
      referer: 'https://carsi.com.au',
      appTitle: 'CARSI Margot',
    });
    const response = await client.chat({
      model: MODEL,
      max_tokens: 900,
      messages: [{ role: 'system', content: systemContent }, ...conversationMessages],
    });

    const reply =
      OpenRouterClient.extractText(response).trim() ||
      "I'm not sure how to answer that right now. Please try rephrasing your question.";

    return NextResponse.json({
      reply,
      conversation_id: conversationId,
      assistant_name: name,
    });
  } catch (error) {
    console.error('[lms/public/chat] request failed:', error);
    return NextResponse.json(
      {
        detail:
          'The assistant is temporarily unavailable due to a network error. Please try again shortly.',
      },
      { status: 502 }
    );
  }
}
