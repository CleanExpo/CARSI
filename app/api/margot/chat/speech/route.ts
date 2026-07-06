import { NextRequest, NextResponse } from 'next/server';

import { getElevenLabsEnv } from '@/lib/server/elevenlabs-env';
import { applyRateLimit, clientIpFrom } from '@/lib/rate-limit';
import { stripMarkdownForSpeech } from '@/lib/server/text-to-speech-format';

export const maxDuration = 30;

const ELEVENLABS_TTS_BASE = 'https://api.elevenlabs.io/v1/text-to-speech';
const TTS_TIMEOUT_MS = 25_000;

const SPEECH_RATE_LIMIT = 5;
const SPEECH_RATE_WINDOW_MS = 60_000;
const SPEECH_DAILY_LIMIT = 100;
const SPEECH_DAY_WINDOW_MS = 24 * 60 * 60 * 1000;

const MAX_TEXT_LEN = 4_000;

type RequestBody = {
  text?: string;
};

function mapElevenLabsError(status: number): string {
  if (status === 401) {
    return 'Voice authentication failed on the server. Please contact CARSI support.';
  }
  if (status === 404) {
    return 'Voice profile is misconfigured on the server. Please contact CARSI support.';
  }
  if (status === 422) {
    return 'This message could not be converted to speech. Try a shorter reply.';
  }
  if (status === 429) {
    return 'Voice service is busy. Please wait a moment and try again.';
  }
  return 'Voice is temporarily unavailable. Please try again shortly.';
}

export async function GET() {
  return NextResponse.json({ available: getElevenLabsEnv().configured });
}

export async function POST(request: NextRequest) {
  const { apiKey, voiceId, modelId, configured } = getElevenLabsEnv();

  if (!configured) {
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
      { detail: 'Too many voice requests. Please wait a moment and try again.' },
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
  if (!text.trim()) {
    return NextResponse.json(
      { detail: 'Nothing speakable in this message after formatting.' },
      { status: 400 }
    );
  }

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
        model_id: modelId,
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0 },
      }),
      signal: AbortSignal.timeout(TTS_TIMEOUT_MS),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error(`[margot/chat/speech] ElevenLabs ${response.status}: ${detail.slice(0, 400)}`);
      return NextResponse.json(
        { detail: mapElevenLabsError(response.status) },
        { status: response.status === 429 ? 429 : 502 }
      );
    }

    const audio = await response.arrayBuffer();
    if (audio.byteLength === 0) {
      return NextResponse.json(
        { detail: 'Voice service returned empty audio. Please try again.' },
        { status: 502 }
      );
    }

    return new NextResponse(audio, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    console.error('[margot/chat/speech] request failed:', error);
    return NextResponse.json(
      {
        detail: timedOut
          ? 'Voice took too long to generate. Try again with a shorter message.'
          : 'Voice is temporarily unavailable due to a network error. Please try again shortly.',
      },
      { status: 502 }
    );
  }
}
