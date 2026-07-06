import { NextRequest, NextResponse } from 'next/server';

import { applyRateLimit, clientIpFrom } from '@/lib/rate-limit';
import { stripMarkdownForSpeech } from '@/lib/server/text-to-speech-format';

// Vercel's default function timeout can be shorter than this route's own
// TTS_TIMEOUT_MS — without this, the platform could kill the function before
// the AbortSignal below fires cleanly (see the identical bug fixed on the
// chat route). Same fix, applied preemptively here.
export const maxDuration = 30;

const ELEVENLABS_TTS_BASE = 'https://api.elevenlabs.io/v1/text-to-speech';
const DEFAULT_MODEL_ID = 'eleven_multilingual_v2';
const TTS_TIMEOUT_MS = 20_000;

// Public, unauthenticated, spends on ElevenLabs — same shape of cap as the
// chat endpoint itself (one speech request per chat reply is the expected
// pattern, so mirroring those limits is generous, not tight).
const SPEECH_RATE_LIMIT = 5;
const SPEECH_RATE_WINDOW_MS = 60_000;
const SPEECH_DAILY_LIMIT = 100;
const SPEECH_DAY_WINDOW_MS = 24 * 60 * 60 * 1000;

const MAX_TEXT_LEN = 4_000;

type RequestBody = {
  text?: string;
};

export async function POST(request: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  const voiceId = process.env.ELEVENLABS_VOICE_ID?.trim();

  if (!apiKey || !voiceId) {
    return NextResponse.json(
      {
        detail:
          'Voice is not configured. Ask your administrator to set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID in the environment.',
      },
      { status: 503 }
    );
  }

  const ip = clientIpFrom(
    request.headers.get('x-forwarded-for'),
    request.headers.get('x-real-ip')
  );
  const minute = applyRateLimit(`public-chat-speech:${ip}`, SPEECH_RATE_LIMIT, SPEECH_RATE_WINDOW_MS);
  const rl = minute.ok
    ? applyRateLimit(`public-chat-speech-day:${ip}`, SPEECH_DAILY_LIMIT, SPEECH_DAY_WINDOW_MS)
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

  const rawText = typeof body.text === 'string' ? body.text.trim() : '';
  if (!rawText) {
    return NextResponse.json({ detail: 'Text is required' }, { status: 400 });
  }
  if (rawText.length > MAX_TEXT_LEN) {
    return NextResponse.json({ detail: 'Text is too long to speak.' }, { status: 400 });
  }

  const text = stripMarkdownForSpeech(rawText);

  try {
    const response = await fetch(`${ELEVENLABS_TTS_BASE}/${encodeURIComponent(voiceId)}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: process.env.ELEVENLABS_MODEL_ID?.trim() || DEFAULT_MODEL_ID,
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0 },
      }),
      signal: AbortSignal.timeout(TTS_TIMEOUT_MS),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error(`[margot/chat/speech] ElevenLabs ${response.status}: ${detail.slice(0, 400)}`);
      return NextResponse.json(
        { detail: 'Voice is temporarily unavailable. Please try again shortly.' },
        { status: 502 }
      );
    }

    const audio = await response.arrayBuffer();
    return new NextResponse(audio, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[margot/chat/speech] request failed:', error);
    return NextResponse.json(
      { detail: 'Voice is temporarily unavailable due to a network error. Please try again shortly.' },
      { status: 502 }
    );
  }
}
