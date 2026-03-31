import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

type RequestBody = {
  message?: string;
  conversation_id?: string | null;
};

export async function POST(request: NextRequest) {
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
            content: message,
          },
        ],
        temperature: 0.4,
      }),
    });

    if (!openaiRes.ok) {
      const text = await openaiRes.text();
      console.error('[lms/public/chat] OpenAI error:', openaiRes.status, text);
      return NextResponse.json(
        {
          detail:
            'The assistant is temporarily unavailable. Please try again in a moment.',
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

