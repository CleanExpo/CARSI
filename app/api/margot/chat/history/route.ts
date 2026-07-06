import { NextRequest, NextResponse } from 'next/server';

import {
  loadMargotHistory,
  margotConversationExists,
} from '@/lib/server/margot-conversation-store';
import { applyRateLimit, clientIpFrom } from '@/lib/rate-limit';

const HISTORY_RATE_LIMIT = 20;
const HISTORY_RATE_WINDOW_MS = 60_000;

export async function GET(request: NextRequest) {
  const conversationId = request.nextUrl.searchParams.get('conversation_id')?.trim();
  if (!conversationId) {
    return NextResponse.json({ detail: 'conversation_id is required.' }, { status: 400 });
  }

  const ip = clientIpFrom(
    request.headers.get('x-forwarded-for'),
    request.headers.get('x-real-ip')
  );
  const rl = applyRateLimit(`margot-history:${ip}`, HISTORY_RATE_LIMIT, HISTORY_RATE_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { detail: 'Too many requests. Please wait a moment and try again.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000))) },
      }
    );
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ conversation_id: conversationId, messages: [] });
  }

  const exists = await margotConversationExists(conversationId);
  if (!exists) {
    return NextResponse.json({ conversation_id: conversationId, messages: [] });
  }

  const messages = await loadMargotHistory(conversationId);
  return NextResponse.json({ conversation_id: conversationId, messages });
}
