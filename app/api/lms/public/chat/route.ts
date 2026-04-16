import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

const MAX_USER_MESSAGE_LENGTH = 2000;
const MAX_TOKENS_CAP = 500;

type RequestBody = {
  message?: string;
  conversation_id?: string | null;
};

/* ----------------------------------------
   Rate Limiting (in-memory, per IP)
   Max 20 requests per hour per IP.
   NOTE: Resets on cold starts in serverless. For production, replace with
   Upstash Redis (@upstash/ratelimit) for durable per-IP limits.
   ---------------------------------------- */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 20;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (record.count >= RATE_LIMIT) return false;
  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  // Kill switch — set DISABLE_PUBLIC_CHAT=1 to disable this endpoint
  if (process.env.DISABLE_PUBLIC_CHAT === '1') {
    return NextResponse.json(
      { detail: 'Public chat is currently unavailable. Please try again later.' },
      { status: 503 }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        detail:
          'Chat assistant is not configured. Ask your administrator to set OPENAI_API_KEY in the environment.',
      },
      { status: 503 }
    );
  }

  // Rate limiting per IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { detail: 'Too many requests. Please wait before sending another message.' },
      { status: 429 }
    );
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON body' }, { status: 400 });
  }

  const rawMessage = typeof body.message === 'string' ? body.message.trim() : '';
  const incomingConversationId =
    typeof body.conversation_id === 'string' ? body.conversation_id.trim() : '';

  if (!rawMessage) {
    return NextResponse.json({ detail: 'Message is required' }, { status: 400 });
  }

  // Cap user message length
  if (rawMessage.length > MAX_USER_MESSAGE_LENGTH) {
    return NextResponse.json(
      { detail: `Message must be ${MAX_USER_MESSAGE_LENGTH} characters or fewer` },
      { status: 400 }
    );
  }

  const conversationId = incomingConversationId || randomUUID();

  try {
    const openaiRes = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are the CARSI LMS assistant. Help users understand courses, IICRC certifications, pricing, and how to use the student dashboard at carsi.com.au. Be concise and friendly.',
          },
          {
            role: 'user',
            content: rawMessage,
          },
        ],
        max_tokens: MAX_TOKENS_CAP,
        temperature: 0.4,
      }),
    });

    if (!openaiRes.ok) {
      const text = await openaiRes.text();
      console.error('[lms/public/chat] OpenAI error:', openaiRes.status, text);
      return NextResponse.json(
        {
          detail: 'The assistant is temporarily unavailable. Please try again in a moment.',
        },
        { status: 502 }
      );
    }

    const data = (await openaiRes.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    const reply =
      data.choices?.[0]?.message?.content?.trim() ||
      "I'm not sure how to answer that right now. Please try rephrasing your question.";

    return NextResponse.json({
      reply,
      conversation_id: conversationId,
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
